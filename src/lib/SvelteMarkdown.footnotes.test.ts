import { act, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import FootnoteRef from './extensions/footnote/FootnoteRef.svelte'
import FootnoteSection from './extensions/footnote/FootnoteSection.svelte'
import { markedFootnote } from './extensions/footnote/markedFootnote.js'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import FootnoteSnippetProbe from './test/footnotes/FootnoteSnippetProbe.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'
import type { RendererComponent, Renderers, Token } from './utils/markdown-parser.js'
import { tokenCache } from './utils/token-cache.js'

useStreamingTestHarness()

interface FootnoteRenderers extends Renderers {
    footnoteRef: RendererComponent
    footnoteSection: RendererComponent
}

const footnoteRenderers: Partial<FootnoteRenderers> = {
    footnoteRef: FootnoteRef,
    footnoteSection: FootnoteSection
}

const footnoteProps = {
    extensions: [markedFootnote()],
    renderers: footnoteRenderers
}

const fragmentTargetId = (anchor: HTMLAnchorElement) =>
    decodeURIComponent(new URL(anchor.href).hash.slice(1))

const navigationSnapshot = (container: HTMLElement) => ({
    references: Array.from(container.querySelectorAll<HTMLAnchorElement>('.footnote-ref a')).map(
        (anchor) => ({ id: anchor.id, target: fragmentTargetId(anchor), label: anchor.textContent })
    ),
    definitions: Array.from(container.querySelectorAll<HTMLElement>('.footnotes li')).map(
        (item) => ({ id: item.id, text: item.firstChild?.textContent?.trim() ?? item.textContent })
    ),
    backlinks: Array.from(container.querySelectorAll<HTMLAnchorElement>('.footnote-backref')).map(
        (anchor) => fragmentTargetId(anchor)
    )
})

const frozenFootnoteTokens = () => {
    const tokens = [
        {
            type: 'paragraph',
            raw: 'First[^n], second[^n].',
            text: 'First[^n], second[^n].',
            tokens: [
                { type: 'text', raw: 'First', text: 'First' },
                { type: 'footnoteRef', raw: '[^n]', id: 'n' },
                { type: 'text', raw: ', second', text: ', second' },
                { type: 'footnoteRef', raw: '[^n]', id: 'n' },
                { type: 'text', raw: '.', text: '.' }
            ]
        },
        {
            type: 'footnoteSection',
            raw: '[^n]: Note.',
            footnotes: [{ id: 'n', text: 'Note.' }]
        }
    ] as Token[]

    const freeze = (value: unknown): void => {
        if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
        Object.freeze(value)
        for (const child of Object.values(value)) freeze(child)
    }
    freeze(tokens)
    return tokens
}

describe('SvelteMarkdown footnotes', () => {
    it('assigns unique anchors to repeated footnote references', () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: 'First[^n], second[^n].\n\n[^n]: Note.',
                ...footnoteProps
            }
        })

        const references = Array.from(
            container.querySelectorAll<HTMLAnchorElement>('.footnote-ref a')
        )
        const backlinks = Array.from(
            container.querySelectorAll<HTMLAnchorElement>('.footnote-backref')
        )
        const definition = container.querySelector<HTMLElement>('li[id^="fn-"]')

        expect(references).toHaveLength(2)
        expect(new Set(references.map((reference) => reference.id)).size).toBe(2)
        expect(backlinks).toHaveLength(2)
        expect(backlinks.map(fragmentTargetId)).toEqual(references.map((reference) => reference.id))
        expect(definition).not.toBeNull()
        expect(references.map(fragmentTargetId)).toEqual([definition!.id, definition!.id])
    })

    it('renders the first duplicate definition without duplicate keys', () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: '[^n]: First.\n[^n]: Second.',
                ...footnoteProps
            }
        })

        const definitions = container.querySelectorAll('li[id^="fn-"]')
        expect(definitions).toHaveLength(1)
        expect(definitions[0].textContent).toContain('First.')
        expect(definitions[0].textContent).not.toContain('Second.')
    })

    it('uses the first definition across separated sections without losing intervening prose', () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: '[^n]: First.\n\nBetween.\n\n[^n]: Second.',
                ...footnoteProps
            }
        })

        const definitions = container.querySelectorAll('.footnotes li')
        expect(definitions).toHaveLength(1)
        expect(definitions[0].textContent).toContain('First.')
        expect(definitions[0].textContent).not.toContain('Second.')
        expect(container.textContent).toContain('Between.')
    })

    it('resolves injective encoded ids for special labels', () => {
        const labels = ['x', 'x-2', 'x:ref:2', 'x~003a', 'é', '__proto__', '\ud800']
        const source = `${labels.map((label) => `ref[^${label}]`).join(' ')}\n\n${labels
            .map((label) => `[^${label}]: ${label}`)
            .join('\n')}`
        const { container } = render(SvelteMarkdown, {
            props: { source, ...footnoteProps }
        })
        const references = Array.from(
            container.querySelectorAll<HTMLAnchorElement>('.footnote-ref a')
        )
        const definitions = Array.from(container.querySelectorAll<HTMLElement>('.footnotes li'))

        expect(references).toHaveLength(labels.length)
        expect(definitions).toHaveLength(labels.length)
        expect(new Set(references.map((anchor) => anchor.id)).size).toBe(labels.length)
        expect(new Set(definitions.map((item) => item.id)).size).toBe(labels.length)
        for (const reference of references) {
            expect(
                definitions.some((definition) => definition.id === fragmentTargetId(reference))
            ).toBe(true)
        }
        const backlinks = Array.from(
            container.querySelectorAll<HTMLAnchorElement>('.footnote-backref')
        )
        for (const backlink of backlinks) {
            expect(
                references.some((reference) => reference.id === fragmentTargetId(backlink))
            ).toBe(true)
        }
    })

    it('does not create ghost backlinks from image alt token children', () => {
        const source = '![image[^n]](https://example.com/img.png) text[^n].\n\n[^n]: Note.'
        const { container } = render(SvelteMarkdown, {
            props: { source, ...footnoteProps }
        })

        expect(container.querySelector('img')?.getAttribute('alt')).toBe('image[^n]')
        expect(container.querySelector('.footnote-ref a')?.id).toBe('fnref-n')
        expect(container.querySelectorAll('.footnote-backref')).toHaveLength(1)
    })

    it('counts nested rendered references in document order', () => {
        const source =
            '*emphasis[^n]*\n\n- list[^n]\n\n> quote[^n]\n\n| cell |\n| --- |\n| table[^n] |\n\n[^n]: Note.'
        const { container } = render(SvelteMarkdown, {
            props: { source, ...footnoteProps }
        })

        expect(
            Array.from(container.querySelectorAll('.footnote-ref a'), (anchor) => anchor.id)
        ).toEqual(['fnref-n', 'fnref-n:ref:2', 'fnref-n:ref:3', 'fnref-n:ref:4'])
        expect(container.querySelectorAll('.footnote-backref')).toHaveLength(4)
    })

    it('renders no backlink when the only reference is inside image alt text', () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: '![image[^n]](https://example.com/img.png)\n\n[^n]: Note.',
                ...footnoteProps
            }
        })

        expect(container.querySelectorAll('.footnote-ref')).toHaveLength(0)
        expect(container.querySelectorAll('.footnote-backref')).toHaveLength(0)
        expect(container.querySelector('.footnotes li')?.textContent).toContain('Note.')
    })

    it('passes additive metadata to snippet overrides without leaking the internal snapshot', () => {
        const { container } = render(FootnoteSnippetProbe, {
            props: { source: 'First[^n], second[^n].\n\n[^n]: Note.' }
        })
        const references = Array.from(
            container.querySelectorAll<HTMLElement>('[data-testid="footnote-ref-probe"]')
        )
        const section = container.querySelector<HTMLElement>(
            '[data-testid="footnote-section-probe"]'
        )

        expect(references.map((element) => element.dataset.referenceId)).toEqual([
            'fnref-n',
            'fnref-n:ref:2'
        ])
        expect(JSON.parse(section!.dataset.footnotes!)).toEqual([
            { id: 'n', text: 'Note.', backrefs: ['fnref-n', 'fnref-n:ref:2'] }
        ])
        expect(references[0].dataset.propKeys).not.toContain('footnoteMetadata')
        expect(section?.dataset.propKeys).not.toContain('footnoteMetadata')
    })

    it('restarts occurrence metadata for cached renders', () => {
        const source = 'First[^n], second[^n].\n\n[^n]: Note.'
        const cacheGet = vi.spyOn(tokenCache, 'getTokens')
        const first = render(SvelteMarkdown, { props: { source, ...footnoteProps } })
        const second = render(SvelteMarkdown, { props: { source, ...footnoteProps } })

        expect(navigationSnapshot(second.container)).toEqual(navigationSnapshot(first.container))
        expect(
            cacheGet.mock.results
                .slice(1)
                .some((result) => result.type === 'return' && result.value)
        ).toBe(true)
    })

    it('isolates metadata when the same frozen tokens render in two instances', () => {
        const source = frozenFootnoteTokens()
        const before = JSON.stringify(source)
        const first = render(SvelteMarkdown, { props: { source, ...footnoteProps } })
        const second = render(SvelteMarkdown, { props: { source, ...footnoteProps } })

        expect(navigationSnapshot(first.container)).toEqual(navigationSnapshot(second.container))
        expect(navigationSnapshot(first.container).references.map(({ id }) => id)).toEqual([
            'fnref-n',
            'fnref-n:ref:2'
        ])
        expect(JSON.stringify(source)).toBe(before)
    })

    it('updates backlinks on a retained prefix definition when a later reference arrives', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true, ...footnoteProps }
        })

        await act(() => component.writeChunk('[^n]: Note.\n\n'))
        await flushStreamingBatch()
        const definitionBefore = container.querySelector('.footnotes li')
        expect(definitionBefore).toBeInstanceOf(HTMLLIElement)
        expect(container.querySelectorAll('.footnote-backref')).toHaveLength(0)

        await act(() => component.writeChunk('Later[^n].'))
        await flushStreamingBatch()

        expect(container.querySelector('.footnotes li')).toBe(definitionBefore)
        expect(container.querySelector('.footnote-backref')).not.toBeNull()
        expect(container.querySelector('.footnote-ref a')?.id).toBe('fnref-n')
    })

    it('retains unchanged reference and definition nodes across streaming append', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true, ...footnoteProps }
        })
        await act(() => component.writeChunk('First[^n].\n\n[^n]: Note.\n\n'))
        await flushStreamingBatch()
        const referenceBefore = container.querySelector('.footnote-ref a')
        const definitionBefore = container.querySelector('.footnotes li')

        await act(() => component.writeChunk('Tail paragraph.'))
        await flushStreamingBatch()

        expect(container.querySelector('.footnote-ref a')).toBe(referenceBefore)
        expect(container.querySelector('.footnotes li')).toBe(definitionBefore)
        expect(container.textContent).toContain('Tail paragraph.')
    })

    it.each([
        ['one UTF-16 code unit at a time', (source: string) => source.split('')],
        [
            'awkward syntax boundaries',
            () => ['Text[', '^😀], again[^', '😀].\n', '\n[^😀', ']: Note.\n\nAfter.']
        ]
    ])('matches static output when streamed %s and after completion', async (_name, chunks) => {
        const source = 'Text[^😀], again[^😀].\n\n[^😀]: Note.\n\nAfter.'
        const staticRender = render(SvelteMarkdown, { props: { source, ...footnoteProps } })
        const streamed = render(SvelteMarkdown, {
            props: { source: '', streaming: true, ...footnoteProps }
        })

        for (const chunk of chunks(source)) {
            await act(() => streamed.component.writeChunk(chunk))
            await flushStreamingBatch()
        }

        expect(navigationSnapshot(streamed.container)).toEqual(
            navigationSnapshot(staticRender.container)
        )
        expect(streamed.container.textContent).toContain('After.')

        await act(() => streamed.rerender({ source, streaming: false, ...footnoteProps }))
        expect(navigationSnapshot(streamed.container)).toEqual(
            navigationSnapshot(staticRender.container)
        )
    })

    it('resets occurrence state for resetStream, streamId replacement, and shorter sources', async () => {
        const firstSource = 'One[^n], two[^n].\n\n[^n]: First.'
        const shortSource = 'Short[^n].\n\n[^n]: Short note.'
        const { component, container, rerender } = render(SvelteMarkdown, {
            props: { source: '', streaming: true, streamId: 'one', ...footnoteProps }
        })

        await act(() => component.resetStream(firstSource))
        await flushStreamingBatch()
        expect(
            Array.from(container.querySelectorAll('.footnote-ref a'), (anchor) => anchor.id)
        ).toEqual(['fnref-n', 'fnref-n:ref:2'])

        await act(() => component.resetStream(shortSource))
        await flushStreamingBatch()
        expect(container.querySelector('.footnote-ref a')?.id).toBe('fnref-n')
        expect(container.textContent).not.toContain('First.')

        await act(() =>
            rerender({ source: shortSource, streaming: true, streamId: 'two', ...footnoteProps })
        )
        await flushStreamingBatch()
        expect(container.querySelector('.footnote-ref a')?.id).toBe('fnref-n')
        expect(container.querySelectorAll('.footnote-backref')).toHaveLength(1)

        await act(() =>
            rerender({ source: firstSource, streaming: true, streamId: 'two', ...footnoteProps })
        )
        await flushStreamingBatch()
        await act(() =>
            rerender({ source: shortSource, streaming: true, streamId: 'two', ...footnoteProps })
        )
        await flushStreamingBatch()
        expect(
            Array.from(container.querySelectorAll('.footnote-ref a'), (anchor) => anchor.id)
        ).toEqual(['fnref-n'])
        expect(container.textContent).not.toContain('First.')
    })
})
