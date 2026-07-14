import { IncrementalParser } from '$lib/utils/incremental-parser.js'
import type { Token } from '$lib/utils/markdown-parser.js'
import { reuseStableTokenArray } from '$lib/utils/streaming-token-reuse.js'
import { describe, expect, it } from 'vitest'

type StreamingTestNode = Record<string, unknown> & {
    type?: string
    text?: string
    tag?: string
    tokens?: StreamingTestNode[]
    items?: StreamingTestNode[]
}

const node = (tokenValue: Token): StreamingTestNode => tokenValue as unknown as StreamingTestNode
const nodes = (tokenValues: Token[]): StreamingTestNode[] =>
    tokenValues as unknown as StreamingTestNode[]

const simulateUi = (parser: IncrementalParser, ui: Token[], source: string): Token[] => {
    const { tokens, divergeAt } = parser.update(source)
    return reuseStableTokenArray(ui, tokens, divergeAt)
}

const findFirst = (
    tokens: StreamingTestNode[] | undefined,
    type: string
): StreamingTestNode | undefined => {
    for (const t of tokens ?? []) {
        if (t.type === type) return t
        const nested = findFirst(t.tokens, type)
        if (nested) return nested
    }
    return undefined
}

describe('happy path (append-only)', () => {
    it('reuses prefix token objects by reference across appends', () => {
        const parser = new IncrementalParser({})
        let ui: Token[] = []
        ui = simulateUi(parser, ui, '# Title\n\nFirst paragraph.\n\n')
        const stableHeading = ui[0]
        ui = simulateUi(parser, ui, '# Title\n\nFirst paragraph.\n\nSecond para')
        expect(ui[0]).toBe(stableHeading)
    })

    it('reuses unchanged list items inside a still-growing list', () => {
        const parser = new IncrementalParser({})
        let ui: Token[] = []
        ui = simulateUi(parser, ui, '- alpha\n- beta\n')
        const listA = node(ui[0])
        const itemAlpha = listA.items?.[0]
        ui = simulateUi(parser, ui, '- alpha\n- beta\n- gamma')
        const listB = node(ui[0])
        expect(listB.items?.[0]).toBe(itemAlpha)
    })
})

describe('suspected bug 1 — reference definition arriving later', () => {
    it('first token updates to a link when its [ref] definition streams in later', () => {
        const parser = new IncrementalParser({})
        let ui: Token[] = []
        ui = simulateUi(parser, ui, 'See [the docs][ref] for details.')
        expect(findFirst(nodes(ui), 'link')).toBeUndefined()

        const full = 'See [the docs][ref] for details.\n\n[ref]: https://example.com'
        const { tokens: freshTokens, divergeAt } = parser.update(full)
        expect(findFirst(nodes(freshTokens), 'link')).toBeDefined()

        ui = reuseStableTokenArray(ui, freshTokens, divergeAt)
        expect(findFirst(nodes(ui), 'link')).toBeDefined()
    })
})

describe('suspected bug 2 — offset-mode edit inside a closed html block', () => {
    it('divergeAt / reuse must not serve stale html children after in-place edit', () => {
        const parser = new IncrementalParser({})
        let ui: Token[] = []
        ui = simulateUi(parser, ui, '<div><span>abc</span></div>\n\nnext para')
        expect(JSON.stringify(ui)).toContain('abc')

        const s2 = '<div><span>xyz</span></div>\n\nnext para'
        const { tokens: freshTokens, divergeAt } = parser.update(s2)
        expect(JSON.stringify(freshTokens)).toContain('xyz')

        ui = reuseStableTokenArray(ui, freshTokens, divergeAt)
        expect(JSON.stringify(ui)).toContain('xyz')
        expect(JSON.stringify(ui)).not.toContain('abc')
    })
})

describe('suspected bug 3 — parser reset with different options', () => {
    it('does not reuse tokens parsed under old options after parser recreation', () => {
        const parserA = new IncrementalParser({ gfm: true, breaks: false })
        let ui: Token[] = []
        const src = 'line one\nline two'
        ui = simulateUi(parserA, ui, src)
        expect(findFirst(nodes(ui), 'br')).toBeUndefined()

        const parserB = new IncrementalParser({ gfm: true, breaks: true })
        const { tokens: freshTokens, divergeAt } = parserB.update(src)
        expect(findFirst(nodes(freshTokens), 'br')).toBeDefined()

        ui = reuseStableTokenArray(ui, freshTokens, divergeAt)
        expect(findFirst(nodes(ui), 'br')).toBeDefined()
    })
})
