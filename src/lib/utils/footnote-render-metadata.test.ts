import { describe, expect, it } from 'vitest'
import {
    encodeFootnoteLabel,
    getFootnoteDefinitionId,
    getFootnoteFragment,
    getFootnoteReferenceId,
    prepareFootnoteRenderMetadata
} from './footnote-render-metadata.js'
import type { Token } from './markdown-parser.js'

const token = (value: Record<string, unknown>) => value as Token

const ref = (id: string) => token({ type: 'footnoteRef', raw: `[^${id}]`, id })

const section = (footnotes: Array<{ id: string; text: string }>) =>
    token({ type: 'footnoteSection', raw: '', footnotes })

const deepFreeze = <T>(value: T): T => {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value)
        for (const child of Object.values(value)) deepFreeze(child)
    }
    return value
}

describe('footnote render metadata', () => {
    it('encodes special labels injectively and preserves simple legacy ids', () => {
        const labels = ['x', 'x-2', 'x:ref:2', 'x~003a', 'é', '__proto__', '\ud800']
        const encoded = labels.map(encodeFootnoteLabel)

        expect(encoded).toEqual([
            'x',
            'x-2',
            'x~003aref~003a2',
            'x~007e003a',
            '~00e9',
            '__proto__',
            '~d800'
        ])
        expect(new Set(encoded).size).toBe(labels.length)
        expect(getFootnoteDefinitionId('my-note')).toBe('fn-my-note')
        expect(getFootnoteReferenceId('my-note')).toBe('fnref-my-note')
        expect(getFootnoteReferenceId('x:ref:2', 2)).toBe('fnref-x~003aref~003a2:ref:2')
        expect(getFootnoteFragment('fnref-x:ref:2')).toBe('#fnref-x%3Aref%3A2')
    })

    it('counts rendered references through nested token containers in document order', () => {
        const emphasisRef = ref('n')
        const listRef = ref('n')
        const blockquoteRef = ref('n')
        const headerRef = ref('n')
        const rowRef = ref('n')
        const definition = section([{ id: 'n', text: 'Note.' }])
        const tokens = deepFreeze([
            token({
                type: 'paragraph',
                raw: '',
                tokens: [token({ type: 'em', raw: '', tokens: [emphasisRef] })]
            }),
            token({
                type: 'list',
                raw: '',
                items: [token({ type: 'list_item', raw: '', tokens: [listRef] })]
            }),
            token({ type: 'blockquote', raw: '', tokens: [blockquoteRef] }),
            token({
                type: 'table',
                raw: '',
                header: [{ text: '', tokens: [headerRef] }],
                rows: [[{ text: '', tokens: [rowRef] }]]
            }),
            definition
        ])

        const metadata = prepareFootnoteRenderMetadata(tokens)

        expect(
            [emphasisRef, listRef, blockquoteRef, headerRef, rowRef].map(
                (reference) => metadata.referenceProps.get(reference)?.referenceId
            )
        ).toEqual(['fnref-n', 'fnref-n:ref:2', 'fnref-n:ref:3', 'fnref-n:ref:4', 'fnref-n:ref:5'])
        expect(metadata.sectionProps.get(definition)?.footnotes).toEqual([
            {
                id: 'n',
                text: 'Note.',
                backrefs: [
                    'fnref-n',
                    'fnref-n:ref:2',
                    'fnref-n:ref:3',
                    'fnref-n:ref:4',
                    'fnref-n:ref:5'
                ]
            }
        ])
    })

    it('uses token identity for occurrences and includes references after definitions', () => {
        const first = ref('n')
        const second = ref('n')
        const definition = section([{ id: 'n', text: 'Note.' }])
        const tokens = deepFreeze([first, definition, second])
        const before = JSON.stringify(tokens)

        const metadata = prepareFootnoteRenderMetadata(tokens)

        expect(metadata.referenceProps.get(first)).toEqual({ referenceId: 'fnref-n' })
        expect(metadata.referenceProps.get(second)).toEqual({ referenceId: 'fnref-n:ref:2' })
        expect(metadata.sectionProps.get(definition)?.footnotes[0].backrefs).toEqual([
            'fnref-n',
            'fnref-n:ref:2'
        ])
        expect(JSON.stringify(tokens)).toBe(before)
    })

    it('applies first-definition-wins across separated sections', () => {
        const firstSection = section([
            { id: '__proto__', text: 'First.' },
            { id: '__proto__', text: 'Adjacent duplicate.' }
        ])
        const secondSection = section([
            { id: '__proto__', text: 'Separated duplicate.' },
            { id: 'other', text: 'Other.' }
        ])
        const protoRef = ref('__proto__')
        const tokens = deepFreeze([
            firstSection,
            token({ type: 'paragraph', raw: 'Between.', tokens: [] }),
            secondSection,
            protoRef
        ])

        const metadata = prepareFootnoteRenderMetadata(tokens)

        expect(metadata.sectionProps.get(firstSection)?.footnotes).toEqual([
            { id: '__proto__', text: 'First.', backrefs: ['fnref-__proto__'] }
        ])
        expect(metadata.sectionProps.get(secondSection)?.footnotes).toEqual([
            { id: 'other', text: 'Other.', backrefs: [] }
        ])
    })

    it('does not count reference-looking image alt tokens or leaf contents', () => {
        const imageAltRef = ref('n')
        const codeRef = ref('n')
        const codespanRef = ref('n')
        const bodyRef = ref('n')
        const definition = section([{ id: 'n', text: 'Note.' }])
        const tokens = deepFreeze([
            token({ type: 'image', raw: '', href: '/image.png', tokens: [imageAltRef] }),
            token({ type: 'code', raw: '', text: '[^n]', tokens: [codeRef] }),
            token({ type: 'codespan', raw: '', text: '[^n]', tokens: [codespanRef] }),
            bodyRef,
            definition
        ])

        const metadata = prepareFootnoteRenderMetadata(tokens)

        expect(metadata.referenceProps.has(imageAltRef)).toBe(false)
        expect(metadata.referenceProps.has(codeRef)).toBe(false)
        expect(metadata.referenceProps.has(codespanRef)).toBe(false)
        expect(metadata.referenceProps.get(bodyRef)).toEqual({ referenceId: 'fnref-n' })
        expect(metadata.sectionProps.get(definition)?.footnotes[0].backrefs).toEqual(['fnref-n'])
    })

    it('prepares no backlinks when a reference appears only in image alt tokens', () => {
        const imageAltRef = ref('n')
        const definition = section([{ id: 'n', text: 'Note.' }])
        const metadata = prepareFootnoteRenderMetadata(
            deepFreeze([
                token({ type: 'image', raw: '', href: '/image.png', tokens: [imageAltRef] }),
                definition
            ])
        )

        expect(metadata.referenceProps.has(imageAltRef)).toBe(false)
        expect(metadata.sectionProps.get(definition)?.footnotes[0].backrefs).toEqual([])
    })

    it('returns fresh snapshots whose occurrence counts restart per document', () => {
        const first = ref('n')
        const second = ref('n')
        const tokens = deepFreeze([first, second])

        const one = prepareFootnoteRenderMetadata(tokens)
        const two = prepareFootnoteRenderMetadata(tokens)

        expect(one).not.toBe(two)
        expect(one.referenceProps).not.toBe(two.referenceProps)
        expect(one.referenceProps.get(first)?.referenceId).toBe('fnref-n')
        expect(two.referenceProps.get(first)?.referenceId).toBe('fnref-n')
        expect(two.referenceProps.get(second)?.referenceId).toBe('fnref-n:ref:2')
    })
})
