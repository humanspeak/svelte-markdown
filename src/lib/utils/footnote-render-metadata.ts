import type { Token } from '$lib/utils/markdown-parser.js'

export interface FootnoteReferenceProps {
    readonly referenceId: string
}

export interface PreparedFootnote {
    readonly id: string
    readonly text: string
    readonly backrefs: readonly string[]
}

export interface FootnoteSectionProps {
    readonly footnotes: readonly PreparedFootnote[]
}

export interface FootnoteRenderMetadata {
    readonly referenceProps: WeakMap<object, FootnoteReferenceProps>
    readonly sectionProps: WeakMap<object, FootnoteSectionProps>
}

type TraversableToken = Token & {
    tokens?: unknown
    items?: unknown
    header?: unknown
    rows?: unknown
    footnotes?: unknown
    id?: unknown
}

interface SourceFootnote {
    id: string
    text: string
}

interface SectionDefinitions {
    token: object
    footnotes: SourceFootnote[]
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null

const isSourceFootnote = (value: unknown): value is SourceFootnote =>
    isObject(value) && typeof value.id === 'string' && typeof value.text === 'string'

/** Encodes a footnote label injectively without relying on valid Unicode scalar values. */
export const encodeFootnoteLabel = (label: string) => {
    let encoded = ''

    for (let index = 0; index < label.length; index++) {
        const codeUnit = label.charCodeAt(index)
        const character = label[index]
        encoded += /[A-Za-z0-9_-]/.test(character)
            ? character
            : `~${codeUnit.toString(16).padStart(4, '0')}`
    }

    return encoded
}

export const getFootnoteDefinitionId = (label: string) => `fn-${encodeFootnoteLabel(label)}`

export const getFootnoteReferenceId = (label: string, occurrence = 1) => {
    const firstId = `fnref-${encodeFootnoteLabel(label)}`
    return occurrence === 1 ? firstId : `${firstId}:ref:${occurrence}`
}

export const getFootnoteFragment = (domId: string) => `#${encodeURIComponent(domId)}`

/**
 * Prepares navigation props for one complete rendered token tree without mutating it.
 */
export const prepareFootnoteRenderMetadata = (tokens: readonly Token[]): FootnoteRenderMetadata => {
    const referenceProps = new WeakMap<object, FootnoteReferenceProps>()
    const sectionProps = new WeakMap<object, FootnoteSectionProps>()
    const referenceCounts = new Map<string, number>()
    const backrefsByLabel = new Map<string, string[]>()
    const definedLabels = new Set<string>()
    const sectionDefinitions: SectionDefinitions[] = []

    const visitCollection = (value: unknown): void => {
        if (!Array.isArray(value)) return

        for (const item of value) {
            if (Array.isArray(item)) {
                visitCollection(item)
            } else if (isObject(item)) {
                visitToken(item as TraversableToken)
            }
        }
    }

    const visitToken = (token: TraversableToken): void => {
        if (token.type === 'footnoteRef' && typeof token.id === 'string') {
            const occurrence = (referenceCounts.get(token.id) ?? 0) + 1
            const referenceId = getFootnoteReferenceId(token.id, occurrence)
            referenceCounts.set(token.id, occurrence)
            referenceProps.set(token, Object.freeze({ referenceId }))

            const backrefs = backrefsByLabel.get(token.id)
            if (backrefs) {
                backrefs.push(referenceId)
            } else {
                backrefsByLabel.set(token.id, [referenceId])
            }
        } else if (token.type === 'footnoteSection' && Array.isArray(token.footnotes)) {
            const footnotes: SourceFootnote[] = []

            for (const footnote of token.footnotes) {
                if (!isSourceFootnote(footnote) || definedLabels.has(footnote.id)) continue
                definedLabels.add(footnote.id)
                footnotes.push({ id: footnote.id, text: footnote.text })
            }

            sectionDefinitions.push({ token, footnotes })
        }

        if (token.type === 'image' || token.type === 'code' || token.type === 'codespan') return

        visitCollection(token.tokens)
        visitCollection(token.items)
        visitCollection(token.header)
        visitCollection(token.rows)
    }

    visitCollection(tokens)

    for (const section of sectionDefinitions) {
        const footnotes = section.footnotes.map((footnote) =>
            Object.freeze({
                ...footnote,
                backrefs: Object.freeze([...(backrefsByLabel.get(footnote.id) ?? [])])
            })
        )
        sectionProps.set(section.token, Object.freeze({ footnotes: Object.freeze(footnotes) }))
    }

    return Object.freeze({ referenceProps, sectionProps })
}
