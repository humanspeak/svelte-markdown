import { markedAlert } from '$lib/extensions/alert/markedAlert.js'
import { markedFootnote } from '$lib/extensions/footnote/markedFootnote.js'
import { markedKatex } from '$lib/extensions/katex/markedKatex.js'
import { markedMermaid } from '$lib/extensions/mermaid/markedMermaid.js'
import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token } from '$lib/utils/markdown-parser.js'
import { Lexer } from 'marked'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildParserOptions } from './extension-options.js'
import { IncrementalParser } from './incremental-parser.js'
import * as parseAndCacheModule from './parse-and-cache.js'
import { isSameStableNode, type ReusableStreamingNode } from './streaming-token-reuse.js'

// Pass-through spy on the comparator so tests can count divergence-scan
// comparisons (plan 011). Behaviour is unchanged: it calls the real function.
vi.mock('./streaming-token-reuse.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('./streaming-token-reuse.js')>()
    return { ...actual, isSameStableNode: vi.fn(actual.isSameStableNode) }
})

/** Private surface of `IncrementalParser` exercised by the tail-window tests. */
interface InternalParser {
    prevTokens: Token[]
    prevSource: string
    getTailWindowBoundary: () => { prefixCount: number; reparseOffset: number }
    hasHtmlSpanMismatch: (token: Token) => boolean
    hasPotentialReferenceUse: (source: string) => boolean
    collectLinks: (tokens: readonly Token[]) => Record<string, unknown>
    appendIntroducesMatch: (source: string, matches: (_candidate: string) => boolean) => boolean
    canUseTailWindow: (
        source: string,
        boundary: { prefixCount: number; reparseOffset: number }
    ) => boolean
    tailWindowDisabled: boolean
}

/** Expose the private tail-window internals without repeating the cast per test. */
const asInternalParser = (parser: IncrementalParser): InternalParser =>
    parser as unknown as InternalParser

/** Asserts streamed root tokens render identically to a fresh one-shot lex. */
const expectSemanticParity = (streamed: Token[], fresh: Token[], source: string): void => {
    expect(streamed.length, `root count for ${JSON.stringify(source)}`).toBe(fresh.length)
    streamed.forEach((streamedRoot, index) => {
        expect(
            isSameStableNode(
                streamedRoot as unknown as ReusableStreamingNode,
                fresh[index] as unknown as ReusableStreamingNode
            ),
            `root ${index} for ${JSON.stringify(source)}`
        ).toBe(true)
    })
}

describe('IncrementalParser', () => {
    const createDefaultOptions = (): SvelteMarkdownOptions => ({ gfm: true })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    describe('Basic Parsing', () => {
        it('should parse simple markdown', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const result = parser.update('# Hello World')

            expect(result.tokens).toBeDefined()
            expect(result.tokens.length).toBeGreaterThan(0)
            expect(result.tokens[0].type).toBe('heading')
            expect(result.divergeAt).toBe(0)
        })

        it('should parse empty string as empty array', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const result = parser.update('')

            expect(result.tokens).toEqual([])
            expect(result.divergeAt).toBe(0)
        })

        it('should parse multiple block elements', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const result = parser.update('# Heading\n\nParagraph text\n\n- Item 1\n- Item 2')

            expect(result.tokens.length).toBeGreaterThanOrEqual(3)
        })
    })

    describe('Incremental Diffing', () => {
        it('should detect unchanged tokens on identical input', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('# Hello\n\nWorld')
            const result = parser.update('# Hello\n\nWorld')

            expect(result.divergeAt).toBe(result.tokens.length)
        })

        it('should detect divergence when appending a new block', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const r1 = parser.update('# Hello\n\nFirst paragraph')
            const firstCount = r1.tokens.length

            const r2 = parser.update('# Hello\n\nFirst paragraph\n\nSecond paragraph')
            expect(r2.tokens.length).toBeGreaterThan(firstCount)
            expect(r2.divergeAt).toBeLessThan(r2.tokens.length)
        })

        it('should report divergeAt 0 on first parse', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const result = parser.update('# Hello')

            expect(result.divergeAt).toBe(0)
        })

        it('should detect change in last token when appending text', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('# Hello\n\nSome text')
            const result = parser.update('# Hello\n\nSome text with more')

            // heading + space are unchanged; paragraph diverges at index 2
            expect(result.divergeAt).toBe(2)
            expect(result.tokens[0].type).toBe('heading')
        })

        it('should handle growing lists correctly', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('- Item 1\n- Item 2')
            const result = parser.update('- Item 1\n- Item 2\n- Item 3')

            expect(result.tokens.length).toBe(1)
            expect(result.tokens[0].type).toBe('list')
            expect(result.divergeAt).toBe(0)
        })

        it('should preserve heading when paragraph grows', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const r1 = parser.update('# Title\n\nFirst paragraph')
            const headingRaw = r1.tokens[0].raw

            const r2 = parser.update('# Title\n\nFirst paragraph with more text')
            expect(r2.tokens[0].raw).toBe(headingRaw)
            // heading + space are unchanged; paragraph diverges at index 2
            expect(r2.divergeAt).toBe(2)
        })

        it('allows stable token reuse for append-only updates without reference syntax', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('# Title\n\n')

            const result = parser.update('# Title\n\nParagraph')

            expect(result.canReuse).toBe(true)
        })

        it('disables stable token reuse when appended reference definitions can change links', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('See [the docs][ref]')

            const result = parser.update('See [the docs][ref]\n\n[ref]: https://example.com')

            expect(result.canReuse).toBe(false)
            // Append-only but reference-sensitive: consumers reuse semantically
            // unchanged tokens across the whole tree, never a raw-equal prefix.
            expect(result.reuseMode).toBe('tree')
            expect(result.divergeAt).toBe(0)
            expect(result.divergeOffset).toBeUndefined()
            expect(result.usedTailWindow).toBe(false)
        })

        it('disables stable token reuse for in-place source edits', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('<div><span>abc</span></div>')

            const result = parser.update('<div><span>xyz</span></div>')

            expect(result.canReuse).toBe(false)
        })
    })

    describe('Reference-link invalidation', () => {
        it.each([
            {
                name: 'introducing a definition during an in-place edit',
                before: 'See [docs]\n\nOld tail.',
                after: 'See [docs]\n\nNew tail.\n\n[docs]: /new',
                href: '/new'
            },
            {
                name: 'changing an existing definition destination',
                before: 'See [docs]\n\n[docs]: /old',
                after: 'See [docs]\n\n[docs]: /new',
                href: '/new'
            },
            {
                name: 'removing the last definition',
                before: 'See [docs]\n\n[docs]: /old',
                after: 'See [docs]\n\nPlain tail.',
                href: undefined
            }
        ])('invalidates unchanged paragraph text when $name', ({ before, after, href }) => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const previous = parser.update(before)

            const result = parser.update(after)

            expect(result.tokens[0].raw).toBe(previous.tokens[0].raw)
            expect(result.tokens).toEqual(parseAndCacheModule.lexAndClean(after, options, false))
            expect(result.canReuse).toBe(false)
            expect(result.usedTailWindow).toBe(false)
            expect(result.divergeAt).toBe(0)
            expect(result.divergeOffset).toBe(0)
            if (href) {
                expect(result.tokens[0]).toMatchObject({
                    tokens: expect.arrayContaining([
                        expect.objectContaining({ type: 'link', href })
                    ])
                })
            } else {
                expect(result.tokens[0]).toMatchObject({
                    tokens: [expect.objectContaining({ type: 'text', text: 'See [docs]' })]
                })
            }
        })

        it('preserves the divergence offset for an edit with unresolved references only', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const prefix = 'See [docs]\n\n'
            parser.update(`${prefix}Old tail.`)

            const source = `${prefix}New tail.`
            const result = parser.update(source)

            expect(result.tokens).toEqual(parseAndCacheModule.lexAndClean(source, options, false))
            expect(result.canReuse).toBe(false)
            expect(result.divergeAt).toBeGreaterThan(0)
            expect(result.divergeOffset).toBe(prefix.length)
        })

        it.each([
            { tail: 'More plain text.', canReuse: true },
            { tail: '[docs]: /docs', canReuse: false }
        ])('avoids full-source reference scans when appending "$tail"', ({ tail, canReuse }) => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const previous = '# Stable heading\n\nSee [docs]\n\n'
            parser.update(previous)
            const internal = asInternalParser(parser)
            const uses = vi.spyOn(internal, 'hasPotentialReferenceUse')
            const definitionWalks = vi.spyOn(internal, 'collectLinks')
            const boundaryScans = vi.spyOn(internal, 'appendIntroducesMatch')
            const source = `${previous}${tail}`

            const result = parser.update(source)

            expect(result.canReuse).toBe(canReuse)
            expect(result.tokens).toEqual(parseAndCacheModule.lexAndClean(source, options, false))
            expect(uses).not.toHaveBeenCalledWith(previous)
            expect(uses).not.toHaveBeenCalledWith(source)
            // Definitions are read from the re-lexed tail's tokens (and the
            // previous tail's), never from a walk over the whole document;
            // prose without `]:` walks nothing.
            for (const [walked] of definitionWalks.mock.calls) {
                expect(walked.length).toBeLessThan(result.tokens.length)
            }
            expect(definitionWalks.mock.calls.length > 0).toBe(tail.includes(']:'))
            // No boundary scan at all: the reference-use flag is already set
            // (`See [docs]`), and definitions no longer need a regex scan.
            expect(boundaryScans).not.toHaveBeenCalled()
        })

        it('keeps semantic parity after every chunk while a reference URL completes', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const finalSource = 'See [ref].\n\n[ref]: https://example.com/a' + 'bc'
            let sawResolvedLink = false

            for (let end = 4; end < finalSource.length + 4; end += 4) {
                const source = finalSource.slice(0, Math.min(end, finalSource.length))
                const result = parser.update(source)
                const fresh = parseAndCacheModule.lexAndClean(source, options, false)

                expectSemanticParity(result.tokens, fresh, source)
                sawResolvedLink ||= JSON.stringify(result.tokens).includes('"type":"link"')
            }

            expect(sawResolvedLink).toBe(true)
            expect(parser.update(finalSource).tokens[0]).toMatchObject({
                tokens: expect.arrayContaining([
                    expect.objectContaining({ type: 'link', href: 'https://example.com/abc' })
                ])
            })
        })
    })

    describe('Code Fences', () => {
        it('should parse complete code fences correctly', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const result = parser.update('```javascript\nconst x = 1\n```')

            expect(result.tokens.length).toBe(1)
            expect(result.tokens[0].type).toBe('code')
        })

        it('should handle code fence streamed incrementally', () => {
            const parser = new IncrementalParser(createDefaultOptions())

            const r1 = parser.update('```javascript\nconst x')
            expect(r1.tokens.length).toBeGreaterThan(0)

            const r2 = parser.update('```javascript\nconst x = 1\n```')
            expect(r2.tokens[0].type).toBe('code')
        })
    })

    describe('Tables', () => {
        it('should parse tables correctly', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const result = parser.update('| A | B |\n|---|---|\n| 1 | 2 |')

            expect(result.tokens.length).toBe(1)
            expect(result.tokens[0].type).toBe('table')
        })
    })

    describe('walkTokens Support', () => {
        it('should call walkTokens on parsed tokens', () => {
            const walked: string[] = []
            const options: SvelteMarkdownOptions = {
                ...createDefaultOptions(),
                walkTokens: (token) => {
                    walked.push(token.type)
                }
            }
            const parser = new IncrementalParser(options)
            parser.update('# Hello\n\nWorld')

            expect(walked.length).toBeGreaterThan(0)
            expect(walked).toContain('heading')
        })
    })

    describe('Tail Window Reparsing', () => {
        it('re-lexes only the last unstable suffix for append-only streams', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())

            parser.update('# Title\n\nFirst paragraph')
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            // heading + space are stable prefix (2 tokens), reparse from offset 9
            expect(boundary).toEqual({ prefixCount: 2, reparseOffset: 9 })
            expect(internalParser.prevSource).toBe('# Title\n\nFirst paragraph')
            expect(
                '# Title\n\nFirst paragraph\n\nSecond paragraph'.startsWith(
                    internalParser.prevSource
                )
            ).toBe(true)
            expect(
                internalParser.canUseTailWindow(
                    '# Title\n\nFirst paragraph\n\nSecond paragraph',
                    boundary
                )
            ).toBe(true)

            parser.update('# Title\n\nFirst paragraph\n\nSecond paragraph')

            expect(lexSpy).toHaveBeenCalledTimes(2)
            expect(lexSpy.mock.calls[1]?.[0]).toBe('First paragraph\n\nSecond paragraph')
            const reparsedTail = lexSpy.mock.calls[1]?.[0] ?? ''
            expect(reparsedTail.length).toBeLessThan(
                '# Title\n\nFirst paragraph\n\nSecond paragraph'.length
            )
        })

        it('reuses a fully stable trailing heading boundary', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())

            parser.update('# Title\n\n')
            const result = parser.update('# Title\n\nParagraph')

            expect(result.tokens[0].type).toBe('heading')
            // marked now emits a space token between heading and paragraph
            expect(result.tokens[1].type).toBe('space')
            expect(result.tokens[2].type).toBe('paragraph')
            // Tail window reparses from after the heading, including the space
            expect(lexSpy.mock.calls[1]?.[0]).toBe('\n\nParagraph')
        })

        it('re-lexes the tail and the citing root, not the whole document, when a definition can change the prefix', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '[foo]\n\nTail'
            const appended = `${source}\n\n[foo]: /docs`

            parser.update(source)
            const result = parser.update(appended)

            // The tail is lexed first (seeded with the prefix's definitions);
            // its `def` token changed `foo`, so the one citing root is re-lexed.
            expect(lexSpy.mock.calls.slice(1).map(([fragment]) => fragment)).toEqual([
                'Tail\n\n[foo]: /docs',
                '[foo]'
            ])
            expect(result.tokens).toEqual(
                parseAndCacheModule.lexAndClean(appended, createDefaultOptions(), false)
            )
            expect(result.divergeAt).toBe(0)
            expect(result.canReuse).toBe(false)
            expect(result.reuseMode).toBe('tree')
            expect(result.usedTailWindow).toBe(true)
        })

        it('re-enables tail-window reparsing after a one-time shortcut definition re-lex', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = 'See [docs]\n\nTail'
            const withDefinition = `${source}\n\n[docs]: /docs`
            const appended = `${withDefinition}\n\nNext`

            parser.update(source)
            parser.update(withDefinition)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            // The definition update re-lexes the tail and the citing root only.
            expect(lexSpy.mock.calls.slice(1, 3).map(([fragment]) => fragment)).toEqual([
                'Tail\n\n[docs]: /docs',
                'See [docs]'
            ])
            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            const result = parser.update(appended)

            expect(lexSpy.mock.calls[3]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            const reparsedTail = lexSpy.mock.calls[3]?.[0] ?? ''
            expect(reparsedTail.length).toBeLessThan(appended.length)
            expect(result.divergeAt).toBeGreaterThan(0)
            expect(result.canReuse).toBe(true)
        })

        // (#325) A reference *definition* already in the stable prefix is
        // invisible to a tail-only re-lex, so a shortcut *use* appended in the
        // tail must force a full parse — otherwise it renders as plain text
        // instead of a link. Guards the "definition in prefix + use in tail"
        // direction (the mirror of "use in prefix + definition in tail").
        it('resolves shortcut references whose definition sits in the stable prefix', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const base = '[docs]: /docs\n\nIntro paragraph.\n\n'
            parser.update(base)
            const next = `${base}See [docs] for details.\n`

            const incremental = parser.update(next)
            const full = parseAndCacheModule.lexAndClean(next, createDefaultOptions(), false)

            expect(incremental.tokens).toEqual(full)
        })

        // (stream-parity-fixes plan 003) The tail is lexed seeded with the
        // prefix's definitions as marked reports them, so a definition nested
        // in a container resolves tail references without a full re-lex.
        it('resolves a tail reference against a blockquote-nested prefix definition from a tail-only lex', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const base = '> [q]: /quoted\n\nIntro paragraph.\n\n'
            parser.update(base)
            const next = `${base}See [q] here.`
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')

            const result = parser.update(next)
            const fragments = lexSpy.mock.calls.map(([fragment]) => fragment)
            lexSpy.mockRestore()

            expect(fragments).toEqual(['\n\nSee [q] here.'])
            expect(result.usedTailWindow).toBe(true)
            expect(result.reuseMode).toBe('prefix')
            expect(result.tokens).toEqual(parseAndCacheModule.lexAndClean(next, options, false))
            expect(JSON.stringify(result.tokens.at(-1))).toContain('"href":"/quoted"')
        })

        it('performs no definition collection while prose without `]:` streams after definitions', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            let source = 'See [a] and [b].\n\n[a]: /a\n\n> [b]: /b\n\n'
            parser.update(source)
            const definitionWalks = vi.spyOn(asInternalParser(parser), 'collectLinks')

            for (const chunk of 'Plain prose with [brackets] and a [link](/x), streaming on.\n\nMore.'.match(
                /[\s\S]{1,7}/g
            ) ?? []) {
                source += chunk
                const result = parser.update(source)
                expect(result.usedTailWindow, JSON.stringify(source)).toBe(true)
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
            }

            expect(definitionWalks).not.toHaveBeenCalled()
        })

        it('re-lexes only the tail and the citing root when reference syntax is split across chunks', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const options = createDefaultOptions()

            const splitUseParser = new IncrementalParser(options)
            splitUseParser.update('See [do')
            splitUseParser.update('See [docs]\n\nTail')
            const splitUseWithDefinition = 'See [docs]\n\nTail\n\n[docs]: /docs'

            const splitUse = splitUseParser.update(splitUseWithDefinition)

            expect(lexSpy.mock.calls.slice(2).map(([fragment]) => fragment)).toEqual([
                'Tail\n\n[docs]: /docs',
                'See [docs]'
            ])
            expect(splitUse.tokens).toEqual(
                parseAndCacheModule.lexAndClean(splitUseWithDefinition, options, false)
            )

            lexSpy.mockClear()

            const splitDefinitionParser = new IncrementalParser(options)
            splitDefinitionParser.update('See [docs]\n\nTail')
            splitDefinitionParser.update('See [docs]\n\nTail\n\n[do')
            const splitDefinition = 'See [docs]\n\nTail\n\n[docs]: /docs'

            const completed = splitDefinitionParser.update(splitDefinition)

            expect(lexSpy.mock.calls.slice(2).map(([fragment]) => fragment)).toEqual([
                '[docs]: /docs',
                'See [docs]'
            ])
            expect(completed.tokens).toEqual(
                parseAndCacheModule.lexAndClean(splitDefinition, options, false)
            )
        })

        it('resolves a reference definition completed across several partial appends', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            // The `[docs]:` marker is built one character-run at a time, so the
            // boundary-crossing line grows across three appends before it first
            // parses as a definition.
            parser.update('[d')
            parser.update('[doc')
            parser.update('[docs]: /x\n\n')
            const final = '[docs]: /x\n\nSee [docs].'

            const result = parser.update(final)
            const full = parseAndCacheModule.lexAndClean(final, createDefaultOptions(), false)

            expect(result.tokens).toEqual(full)
        })

        it('resolves a full reference use split across the append boundary', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            // A full reference `[a][b]` (LINK_REFERENCE_RE, a different path
            // than a shortcut `[docs]`) straddles the boundary: `See [a][` then
            // `b]`. The definition arrives afterward and must force a full parse.
            parser.update('See [a][')
            parser.update('See [a][b]\n\nTail')
            const final = 'See [a][b]\n\nTail\n\n[b]: /x'

            const result = parser.update(final)
            const full = parseAndCacheModule.lexAndClean(final, createDefaultOptions(), false)

            expect(result.tokens).toEqual(full)
        })

        it('keeps stable token reuse for appended definitions when no reference use exists', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            // Definition labels look like shortcut references, but they are not
            // renderable uses — appending another definition cannot change any
            // rendered link, so the tail window stays usable.
            const source = '[a]: /1\n\nIntro paragraph.\n\n'
            parser.update(source)

            const appended = `${source}[b]: /2`
            const result = parser.update(appended)
            const full = parseAndCacheModule.lexAndClean(appended, createDefaultOptions(), false)

            expect(result.canReuse).toBe(true)
            expect(result.tokens).toEqual(full)
        })

        it('keeps full reference syntax conservative until its definition arrives', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = 'See [docs][ref]\n\nTail'
            const appended = `${source}\n\n[ref]: /docs`

            parser.update(source)
            const result = parser.update(appended)

            expect(lexSpy.mock.calls.slice(1).map(([fragment]) => fragment)).toEqual([
                'Tail\n\n[ref]: /docs',
                'See [docs][ref]'
            ])
            expect(result.divergeAt).toBe(0)
        })

        it('keeps tail-window reparsing enabled for inline links', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = 'See [docs](/docs)\n\nTail'
            const appended = `${source}\n\nNext`

            parser.update(source)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(source.slice(0, boundary.reparseOffset)).toContain('[docs](/docs)')
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            expect((lexSpy.mock.calls[1]?.[0] as string).length).toBeLessThan(appended.length)
        })

        it('does not permanently disable tail-window reparsing after closed HTML blocks', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '<details><summary>One</summary><p>Body</p></details>\n\nTail'
            const appended = `${source}\n\nNext`

            parser.update(source)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            expect((lexSpy.mock.calls[1]?.[0] as string).length).toBeLessThan(appended.length)
        })

        it('keeps tail-window reparsing enabled after multiple closed HTML blocks', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '<div>One</div>\n\n<details><summary>Two</summary>Body</details>\n\nTail'
            const appended = `${source}\n\nNext`

            parser.update(source)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            expect((lexSpy.mock.calls[1]?.[0] as string).length).toBeLessThan(appended.length)
        })

        it('keeps tail-window reparsing enabled after self-closing HTML tags', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '<br/>\n\nTail'
            const appended = `${source}\n\nNext`

            parser.update(source)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            expect((lexSpy.mock.calls[1]?.[0] as string).length).toBeLessThan(appended.length)
        })

        it('keeps tail-window reparsing disabled while HTML spans are still open', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '<details><summary>One'
            const appended = `${source} more`

            parser.update(source)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            expect(boundary).toEqual({ prefixCount: 0, reparseOffset: 0 })
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(false)

            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended)
        })

        it('keeps tail-window reparsing enabled for shortcut-looking citations without definitions', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = 'Citation [1]\n\nTail'
            const appended = `${source}\n\nNext`

            parser.update(source)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(source.slice(0, boundary.reparseOffset)).toContain('[1]')
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            expect((lexSpy.mock.calls[1]?.[0] as string).length).toBeLessThan(appended.length)
        })

        it('keeps tail-window reparsing enabled for task lists without definitions', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '- [ ] First task\n\nTail'
            const appended = `${source}\n\nNext`

            parser.update(source)
            const internalParser = asInternalParser(parser)
            const boundary = internalParser.getTailWindowBoundary()

            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(source.slice(0, boundary.reparseOffset)).toContain('[ ]')
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            expect((lexSpy.mock.calls[1]?.[0] as string).length).toBeLessThan(appended.length)
        })

        it('falls back to a full re-lex when walkTokens is configured', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser({
                ...createDefaultOptions(),
                walkTokens() {}
            })
            const source = '# Title\n\nFirst paragraph'
            const appended = `${source}\n\nSecond paragraph`

            parser.update(source)
            parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended)
        })

        // Offset integrity (stream-parity-fixes plan 001): marked can consume
        // source without a token of the same length, which would land the
        // tail-window offset in the wrong place.
        it('never uses the tail window for a CRLF document and matches a one-shot parse', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const document =
                '# Title\r\n\r\nFirst paragraph.\r\n\r\n- one\r\n- two\r\n\r\nLast paragraph.\r\n'
            let source = ''
            for (const chunk of document.match(/[\s\S]{1,3}/g) ?? []) {
                source += chunk
                const result = parser.update(source)
                expect(result.usedTailWindow, JSON.stringify(source)).toBe(false)
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
            }
        })

        it('leaves the tail window once CRLF arrives after an LF prefix, keeping parity', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const chunks = [
                '# Title\n\nFirst',
                ' paragraph.\n\n',
                'CRLF paragraph.\r\n\r\n',
                'Next paragraph.\r\n\r\n',
                'Last paragraph.\r\n'
            ]
            let source = ''
            const usedTailWindow: boolean[] = []
            for (const chunk of chunks) {
                source += chunk
                const result = parser.update(source)
                usedTailWindow.push(result.usedTailWindow)
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
            }

            // The CRLF chunk is first lexed in the tail window, whose roots
            // then do not add up to the source, so that result is discarded
            // for a full re-lex (plan 005); the mismatch the full parse keeps
            // turns the tail window off for every later update.
            expect(usedTailWindow).toEqual([false, true, false, false, false])
            expect(asInternalParser(parser).getTailWindowBoundary()).toEqual({
                prefixCount: 0,
                reparseOffset: 0
            })
        })

        it('keeps the tail window for an LF-only document', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            // The first update already has a stable heading root, so every
            // append after it has a non-empty tail-window boundary.
            let source = '# Title\n\nFirst'
            const rest = ' paragraph.\n\n- one\n- two\n\nSecond paragraph.\n\nLast one.\n'
            expect(parser.update(source).usedTailWindow).toBe(false)
            const usedTailWindow: boolean[] = []
            for (const chunk of rest.match(/[\s\S]{1,6}/g) ?? []) {
                source += chunk
                usedTailWindow.push(parser.update(source).usedTailWindow)
            }

            expect(usedTailWindow.length).toBeGreaterThan(5)
            // Every append after the first update stays on the fast path.
            expect(usedTailWindow.every(Boolean)).toBe(true)
        })

        // Plan 008: a carriage return can make one root shorter than its span
        // while another is longer, so the length sum cannot be trusted.
        it('refuses the tail window for an append that brings a carriage return', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const internal = asInternalParser(parser)
            parser.update('# Title\n\nFirst.\n\n')
            const boundary = internal.getTailWindowBoundary()
            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(internal.canUseTailWindow('# Title\n\nFirst.\n\nNext.\n', boundary)).toBe(true)
            expect(internal.canUseTailWindow('# Title\n\nFirst.\n\nNext.\r\n', boundary)).toBe(
                false
            )
        })

        it('regains the tail window after an edit removes every carriage return', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('# Title\r\n\r\nFirst.\r\n')
            expect(parser.update('# Title\r\n\r\nFirst.\r\n\r\nNext.\n').usedTailWindow).toBe(false)
            // Not an append: a full re-lex recomputes the flag from the source.
            let source = '# Title\n\nFirst.\n\n'
            expect(parser.update(source).usedTailWindow).toBe(false)
            const usedTailWindow: boolean[] = []
            for (const chunk of ['Next.\n\n', 'More.\n\n', 'End.\n']) {
                source += chunk
                usedTailWindow.push(parser.update(source).usedTailWindow)
            }
            expect(usedTailWindow).toEqual([true, true, true])
        })

        it('keeps parity through three more paragraphs after a duplicate definition', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const chunks = [
                'See [1] for details.\n\n',
                '[1]: https://a.example\n\n',
                'Some prose.\n\n',
                '[1]: https://b.example\n\n',
                'Paragraph one after.\n\n',
                'Paragraph two after.\n\n',
                'Paragraph three after.\n'
            ]
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                const result = parser.update(source)
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
            }
            const text = parser
                .update(source)
                .tokens.map((token) => token.raw)
                .join('')
            expect(text).not.toContain('b.example')
        })
    })

    describe('Streaming Bookkeeping Performance', () => {
        it('starts the divergence scan at the reused prefix boundary on a tail-window append (plan 011)', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = Array.from({ length: 25 }, (_, index) => `Paragraph ${index}`).join(
                '\n\n'
            )
            const first = parser.update(source)
            expect(first.tokens).toHaveLength(49)

            const { prefixCount } = asInternalParser(parser).getTailWindowBoundary()
            expect(prefixCount).toBe(48)

            const compare = vi.mocked(isSameStableNode)
            compare.mockClear()
            const next = `${source}\n\nTail`
            const result = parser.update(next)

            expect(result.usedTailWindow).toBe(true)
            // Only the re-lexed tail roots are compared (+1 for the first
            // mismatch), not every reused prefix root.
            expect(compare.mock.calls.length).toBeLessThanOrEqual(
                result.tokens.length - prefixCount + 1
            )
            // The divergence point and its source offset are unchanged.
            expect(result.divergeAt).toBe(49)
            const expectedOffset = result.tokens
                .slice(0, result.divergeAt)
                .reduce((total, token) => total + token.raw.length, 0)
            expect(result.divergeOffset).toBe(expectedOffset)
            expect(next.slice(expectedOffset)).toBe('\n\nTail')
            expectSemanticParity(
                result.tokens,
                parseAndCacheModule.lexAndClean(next, createDefaultOptions(), false),
                next
            )
        })

        it('keeps comparing from index 0 when the tail window is bypassed (plan 011)', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = Array.from({ length: 10 }, (_, index) => `Paragraph ${index}`).join(
                '\n\n'
            )
            parser.update(source)

            const compare = vi.mocked(isSameStableNode)
            compare.mockClear()
            // Not an append: full re-lex, full scan from index 0.
            const edited = source.replace('Paragraph 9', 'Paragraph nine')
            const result = parser.update(edited)

            expect(result.usedTailWindow).toBe(false)
            expect(result.divergeAt).toBe(18)
            expect(compare.mock.calls.length).toBe(19)
        })

        it('does not rescan every stable prefix token to compute the tail-window offset', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = Array.from(
                { length: 40 },
                (_, index) => `# Heading ${index}\n\nParagraph ${index}`
            ).join('\n\n')

            parser.update(source)

            const internalParser = asInternalParser(parser)
            let sourceLengthReads = 0

            for (const token of internalParser.prevTokens.slice(0, -1)) {
                const sourceLength = token.raw.length
                Object.defineProperty(token, 'sourceLength', {
                    configurable: true,
                    get() {
                        sourceLengthReads++
                        return sourceLength
                    }
                })
            }

            parser.update(`${source}\n\nAppended tail`)

            expect(sourceLengthReads).toBeLessThanOrEqual(1)
        })

        it('does not rescan stable closed HTML tokens when updating span-mismatch state', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = `${Array.from(
                { length: 40 },
                (_, index) => `<div><span>HTML ${index}</span></div>`
            ).join('\n\n')}\n\nTail`

            parser.update(source)

            const internalParser = asInternalParser(parser)
            const originalHasHtmlSpanMismatch = internalParser.hasHtmlSpanMismatch
            let spanMismatchChecks = 0

            internalParser.hasHtmlSpanMismatch = (token) => {
                spanMismatchChecks++
                return originalHasHtmlSpanMismatch(token)
            }

            parser.update(`${source}\n\nAppended tail`)

            expect(spanMismatchChecks).toBeLessThanOrEqual(3)
        })

        it('does not scan the full previous source for reference uses when no definitions exist', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = Array.from(
                { length: 120 },
                (_, index) => `Citation [${index}] and task - [ ] item ${index}.`
            ).join('\n')

            parser.update(source)

            const internalParser = asInternalParser(parser)
            const originalHasPotentialReferenceUse = internalParser.hasPotentialReferenceUse
            const scannedLengths: number[] = []

            internalParser.hasPotentialReferenceUse = (scannedSource) => {
                scannedLengths.push(scannedSource.length)
                return originalHasPotentialReferenceUse(scannedSource)
            }

            parser.update(`${source}\n\nPlain appended tail without definitions.`)

            expect(Math.max(...scannedLengths)).toBeLessThan(source.length / 4)
        })

        it('keeps the tail-window offset correct across closed HTML source spans', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '<div><section><p>Nested</p></section></div>\n\nTail'

            parser.update(source)

            const boundary = asInternalParser(parser).getTailWindowBoundary()

            expect(boundary.reparseOffset).toBe(source.length - 'Tail'.length)
            expect(source.slice(boundary.reparseOffset)).toBe('Tail')
        })

        it('keeps reference definitions in the prefix visible to appended shortcut uses', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '[docs]: /docs\n\nIntro paragraph.\n\n'
            const appended = `${source}See [docs] for details.`

            parser.update(source)
            const result = parser.update(appended)
            const full = parseAndCacheModule.lexAndClean(appended, createDefaultOptions(), false)

            // Only the tail is lexed, seeded with the prefix's definition.
            expect(lexSpy.mock.calls[1]?.[0]).toBe('\n\nSee [docs] for details.')
            expect(lexSpy.mock.calls[1]?.[3]).toEqual({ docs: { href: '/docs', title: undefined } })
            expect(result.usedTailWindow).toBe(true)
            expect(result.tokens).toEqual(full)
        })

        it('does not rescan the stable prefix after a full-relex fallback has refreshed state', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = `${Array.from(
                { length: 40 },
                (_, index) => `# Heading ${index}\n\nParagraph with [docs] ${index}`
            ).join('\n\n')}\n\nTail`
            const withDefinition = `${source}\n\n[docs]: /docs`

            parser.update(source)
            parser.update(withDefinition)

            const internalParser = asInternalParser(parser)
            let sourceLengthReads = 0

            for (const token of internalParser.prevTokens.slice(0, -1)) {
                const sourceLength = token.raw.length
                Object.defineProperty(token, 'sourceLength', {
                    configurable: true,
                    get() {
                        sourceLengthReads++
                        return sourceLength
                    }
                })
            }

            parser.update(`${withDefinition}\n\nAppended tail after fallback`)

            expect(sourceLengthReads).toBeLessThanOrEqual(1)
        })

        it('does no definition work and no boundary scan for an append without `]:`', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            // A reference use is present but its definition has not arrived yet:
            // the state where an appended definition would matter.
            parser.update('See [docs]\n\n')

            const internalParser = asInternalParser(parser)
            const originalAppendIntroducesMatch = internalParser.appendIntroducesMatch
            const definitionWalks = vi.spyOn(internalParser, 'collectLinks')
            let boundaryScans = 0

            internalParser.appendIntroducesMatch = (scannedSource, matches) => {
                boundaryScans++
                return originalAppendIntroducesMatch(scannedSource, matches)
            }

            const result = parser.update('See [docs]\n\nmore streamed text')

            expect(result.usedTailWindow).toBe(true)
            expect(definitionWalks).not.toHaveBeenCalled()
            // The reference-use flag is already set, so nothing is rescanned.
            expect(boundaryScans).toBe(0)
        })

        it('reuses the cached definition flag instead of rescanning prevSource on in-place edits', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = `${Array.from({ length: 60 }, (_, index) => `See [ref${index}]`).join(
                '\n\n'
            )}\n\n[ref0]: /a`

            parser.update(source)

            const internalParser = asInternalParser(parser)
            const originalHasPotentialReferenceUse = internalParser.hasPotentialReferenceUse
            const scannedLengths: number[] = []

            internalParser.hasPotentialReferenceUse = (scannedSource) => {
                scannedLengths.push(scannedSource.length)
                return originalHasPotentialReferenceUse(scannedSource)
            }

            // Non-append (in-place) edit: the reference-sensitivity check must
            // read the cached use flag and the cached definitions for the
            // previous source rather than rescan it.
            const result = parser.update('Rewritten [ref0] content\n\n[ref0]: /b')

            expect(result.divergeAt).toBe(0)
            expect(scannedLengths.length).toBeGreaterThan(0)
            expect(Math.max(...scannedLengths)).toBeLessThan(source.length)
        })
    })

    /**
     * Builds parser options exactly the way `SvelteMarkdown.svelte` does
     * (via `buildParserOptions`), so the extension tokenizers land in
     * `options.extensions.block` / `.inline` where the constructor reads them.
     *
     * @param extensions - Marked extensions to register
     * @returns Parser options with the extensions merged in
     * @example
     * ```ts
     * const options = createExtensionOptions([markedKatex(), markedAlert()])
     * ```
     */
    const createExtensionOptions = (
        extensions: Parameters<typeof buildParserOptions>[1]
    ): SvelteMarkdownOptions => buildParserOptions({ gfm: true }, extensions)

    /**
     * Word-chunks a source the same way the streaming perf-bench does, so the
     * parity tests replay a realistic LLM-style token cadence.
     *
     * @param source - Markdown source to split
     * @returns Word-sized chunks (word + trailing whitespace)
     * @example
     * ```ts
     * wordChunks('a b') // => ['a ', 'b']
     * ```
     */
    const wordChunks = (source: string): string[] => {
        const chunks: string[] = []
        const re = /\S+\s*/g
        let match: RegExpExecArray | null
        while ((match = re.exec(source)) !== null) chunks.push(match[0])
        return chunks
    }

    /**
     * Feeds `chunks` cumulatively into a parser, asserting after EVERY append
     * that the incremental tokens deep-equal a one-shot lex of the accumulated
     * source — a malformed intermediate parse cannot self-correct on the final
     * append and still pass.
     *
     * @param parser - Parser under test
     * @param chunks - Chunks appended cumulatively
     * @param options - The same options the parser was constructed with, for
     *   the per-append one-shot comparison lex
     * @returns Tokens from the final append
     * @example
     * ```ts
     * const tokens = streamThrough(parser, wordChunks(source), options)
     * ```
     */
    const streamThrough = (
        parser: IncrementalParser,
        chunks: string[],
        options: SvelteMarkdownOptions
    ): Token[] => {
        let accumulated = ''
        let tokens: Token[] = []
        for (const chunk of chunks) {
            accumulated += chunk
            tokens = parser.update(accumulated).tokens
            expect(tokens).toEqual(parseAndCacheModule.lexAndClean(accumulated, options, false))
        }
        return tokens
    }

    describe('Extension streaming parity', () => {
        // A corpus that interleaves prose, block `$$…$$` math, inline `\(…\)`
        // math, and `> [!NOTE]` alerts — the token shapes the marketed katex +
        // alert extensions handle.
        const EXTENSION_CORPUS = [
            '# Streaming Extensions',
            '',
            'Intro prose with inline math \\(a_0 = 1\\) and a [link](https://example.com).',
            '',
            '$$',
            'E = mc^2 + \\sum_{k=0}^{3} \\frac{k}{4}',
            '$$',
            '',
            '> [!NOTE]',
            '> Remember to normalize the coefficient before the next section.',
            '',
            '## Section Two',
            '',
            'More prose with another inline expression \\(b = \\pi r^2\\).',
            '',
            '> [!WARNING]',
            '> Watch out for the boundary condition here.',
            '',
            'Closing remarks after the alert.'
        ].join('\n')

        it('streams katex + alert content to the same tokens as a one-shot lex', () => {
            const options = createExtensionOptions([markedKatex(), markedAlert()])
            const parser = new IncrementalParser(options)

            const streamed = streamThrough(parser, wordChunks(EXTENSION_CORPUS), options)
            const oneShot = parseAndCacheModule.lexAndClean(EXTENSION_CORPUS, options, false)

            expect(streamed).toEqual(oneShot)
        })

        it('matches a one-shot lex when chunk boundaries fall inside math and alerts', () => {
            const options = createExtensionOptions([markedKatex(), markedAlert()])
            const parser = new IncrementalParser(options)

            // Fixed-size chunking deliberately splits inside `$$…$$`, inside
            // `\(…\)`, and mid-alert, exercising partial-token appends.
            const chunks: string[] = []
            for (let i = 0; i < EXTENSION_CORPUS.length; i += 7) {
                chunks.push(EXTENSION_CORPUS.slice(i, i + 7))
            }

            const streamed = streamThrough(parser, chunks, options)
            const oneShot = parseAndCacheModule.lexAndClean(EXTENSION_CORPUS, options, false)

            expect(streamed).toEqual(oneShot)
        })

        it('streams a mermaid fence split across chunks to the same tokens as a one-shot lex', () => {
            const options = createExtensionOptions([markedMermaid()])
            const parser = new IncrementalParser(options)
            const source = [
                'Intro prose before the diagram.',
                '',
                '```mermaid',
                'graph TD',
                '    A[Start] --> B{Decision}',
                '    B -->|yes| C[Done]',
                '```',
                '',
                'Closing prose after the diagram.'
            ].join('\n')

            // Fixed-size chunking deliberately splits inside the fence so the
            // mermaid tokenizer sees partial fences on intermediate appends.
            const chunks: string[] = []
            for (let i = 0; i < source.length; i += 5) {
                chunks.push(source.slice(i, i + 5))
            }

            const streamed = streamThrough(parser, chunks, options)
            const oneShot = parseAndCacheModule.lexAndClean(source, options, false)

            expect(streamed).toEqual(oneShot)
        })

        it('keeps single-dollar inline katex parity when enabled', () => {
            const options = createExtensionOptions([markedKatex({ singleDollarInline: true })])
            const parser = new IncrementalParser(options)
            const source = 'Cost is $5 but energy is $E = mc^2$ across the board.\n\nTail prose.'

            const streamed = streamThrough(parser, wordChunks(source), options)
            const oneShot = parseAndCacheModule.lexAndClean(source, options, false)

            expect(streamed).toEqual(oneShot)
        })
    })

    describe('Full-reparse metadata prefix offset', () => {
        // A custom extension whose tokenizer never matches: normal markdown is
        // produced, but its mere presence keeps the parser on the full-reparse
        // path (no `tailWindowSafe` marker), exactly like a user extension.
        const noopExtension = {
            extensions: [
                {
                    name: 'noopBlock',
                    level: 'block' as const,
                    start: () => undefined,
                    tokenizer: () => undefined
                }
            ]
        }

        it('reports the absolute source offset of the first changed token on the full-reparse path', () => {
            const options = createExtensionOptions([noopExtension])
            const parser = new IncrementalParser(options)
            // Confirm we are genuinely on the full-reparse (tail-window-off) path.
            expect(asInternalParser(parser).tailWindowDisabled).toBe(true)

            const base = '# Alpha\n\nBravo paragraph.\n\n'
            parser.update(base)
            const appended = `${base}Charlie paragraph.`

            const result = parser.update(appended)

            expect(result.canReuse).toBe(true)
            expect(result.divergeAt).toBeGreaterThan(0)
            expect(result.divergeOffset).toBe(base.length)
            // The offset must point at the first byte of the appended token.
            expect(appended.slice(result.divergeOffset)).toBe('Charlie paragraph.')
        })

        it('falls back to an undefined offset when an unknown HTML span sits in the reused prefix', () => {
            const options = createExtensionOptions([noopExtension])
            const parser = new IncrementalParser(options)
            expect(asInternalParser(parser).tailWindowDisabled).toBe(true)

            // An unclosed `<details>` opening (its `</details>` never arrives)
            // has no known source span, so any offset at or beyond it is
            // untrustworthy. It sits at the head of the reused prefix.
            const base = '<details>\n<summary>Title</summary>\n\nBoxed paragraph.\n\n'
            parser.update(base)
            const appended = `${base}Trailing paragraph.`

            const result = parser.update(appended)

            // Sanity: the unclosed opening really is an unknown-span html token
            // sitting in the matched prefix.
            const internal = asInternalParser(parser)
            const openingIsUnknownSpan = internal.prevTokens.some(
                (token) => token.type === 'html' && internal.hasHtmlSpanMismatch(token)
            )
            expect(openingIsUnknownSpan).toBe(true)
            expect(result.canReuse).toBe(true)
            expect(result.divergeOffset).toBeUndefined()
        })
    })

    describe('Tail-safe built-in extensions', () => {
        it('engages the tail-window for katex + alert streams', () => {
            const options = createExtensionOptions([markedKatex(), markedAlert()])
            const parser = new IncrementalParser(options)
            // The tail-safe marker must flip the constructor decision.
            expect(asInternalParser(parser).tailWindowDisabled).toBe(false)

            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const base =
                '# Math\n\n$$\nE = mc^2\n$$\n\n> [!NOTE]\n> Normalize the coefficient.\n\nProse tail.\n\n'
            parser.update(base)

            const internal = asInternalParser(parser)
            const boundary = internal.getTailWindowBoundary()
            expect(boundary.reparseOffset).toBeGreaterThan(0)

            const appended = `${base}Appended paragraph after warm-up.`
            expect(internal.canUseTailWindow(appended, boundary)).toBe(true)

            parser.update(appended)

            // Tail-window engaged: the second update re-lexes only the appended
            // tail slice, never the whole accumulated source.
            const lastLexInput = lexSpy.mock.calls.at(-1)?.[0]
            expect(lastLexInput).toBe(appended.slice(boundary.reparseOffset))
            expect((lastLexInput as string).length).toBeLessThan(appended.length)
        })

        it('produces the same tokens on the tail-window path as a one-shot lex (katex + alert)', () => {
            const options = createExtensionOptions([markedKatex(), markedAlert()])
            const source =
                '# Doc\n\nIntro \\(x\\) prose.\n\n$$\na^2 + b^2 = c^2\n$$\n\n' +
                '> [!TIP]\n> Keep it simple.\n\nMiddle prose.\n\n$$\n\\int_0^1 x\\,dx\n$$\n\nEnd.'

            // Warm-up update so the tail-window is primed, then a final append.
            const parser = new IncrementalParser(options)
            const warm = `${source}\n\n`
            parser.update(warm)
            const final = `${warm}> [!WARNING]\n> Final alert.\n`
            const streamed = parser.update(final)
            const oneShot = parseAndCacheModule.lexAndClean(final, options, false)

            expect(streamed.tokens).toEqual(oneShot)
        })

        it('marks katex, alert, and mermaid as tail-safe', () => {
            for (const extensions of [
                [markedKatex()],
                [markedAlert()],
                [markedMermaid()],
                [markedKatex(), markedAlert(), markedMermaid()]
            ]) {
                const parser = new IncrementalParser(createExtensionOptions(extensions))
                expect(asInternalParser(parser).tailWindowDisabled).toBe(false)
            }
        })

        it('keeps footnote streams on the full-reparse path (footnote is not tail-safe)', () => {
            const options = createExtensionOptions([markedFootnote()])
            const parser = new IncrementalParser(options)
            expect(asInternalParser(parser).tailWindowDisabled).toBe(true)

            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const base = 'Body text[^1].\n\n[^1]: A footnote definition.\n\n'
            parser.update(base)
            const appended = `${base}More streamed text.`
            parser.update(appended)

            // Full reparse: the whole accumulated source is re-lexed each update.
            expect(lexSpy.mock.calls.at(-1)?.[0]).toBe(appended)
        })

        it('disables the tail-window when any registered extension is not tail-safe', () => {
            // katex (safe) mixed with footnote (unsafe) ⇒ conservative disable.
            const options = createExtensionOptions([markedKatex(), markedFootnote()])
            const parser = new IncrementalParser(options)
            expect(asInternalParser(parser).tailWindowDisabled).toBe(true)
        })

        it('keeps a user-supplied custom extension without the marker on the full-reparse path', () => {
            const customExtension = {
                extensions: [
                    {
                        name: 'customInline',
                        level: 'inline' as const,
                        start: () => undefined,
                        tokenizer: () => undefined
                    }
                ]
            }
            const options = createExtensionOptions([customExtension])
            const parser = new IncrementalParser(options)
            expect(asInternalParser(parser).tailWindowDisabled).toBe(true)

            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const base = '# Heading\n\nStable paragraph.\n\n'
            parser.update(base)
            const appended = `${base}Appended paragraph.`
            parser.update(appended)

            expect(lexSpy.mock.calls.at(-1)?.[0]).toBe(appended)
        })
    })

    describe('Tail-window boundary across blank lines', () => {
        /** Copy of `section(index)` from `src/routes/test/stream-compare/+page.svelte`. */
        const proseSection = (index: number): string => `## Section ${index}: Streaming performance

This paragraph contains **bold text**, *emphasis*, \`inline code\`, and a
[stable link](https://example.com/${index}) so each renderer performs realistic inline work.

- Item ${index}.1 with a short explanation
- Item ${index}.2 with another **formatted value**
- Item ${index}.3 with a nested detail
  - Nested ${index}.a
  - Nested ${index}.b

> A blockquote for section ${index} keeps the block shapes varied.

\`\`\`ts
const section${index} = { active: true, value: ${index} }
\`\`\`

| Metric | Value |
| --- | ---: |
| section | ${index} |
| doubled | ${index * 2} |

`
        const PROSE_MIXED = `# Long streaming benchmark\n\n${proseSection(0)}${proseSection(1)}`

        /** Streams cumulative sources through one parser, asserting parity after every chunk. */
        const streamParity = (chunks: string[]): void => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                const result = parser.update(source)
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
            }
        }

        /** Splits `source` into fixed-size chunks. */
        const chunkBy = (source: string, size: number): string[] => {
            const chunks: string[] = []
            for (let i = 0; i < source.length; i += size) chunks.push(source.slice(i, i + size))
            return chunks
        }

        it('keeps a nested list open across a whitespace-only line', () => {
            streamParity(['- a\n  - b\n ', ' - c\n'])
        })

        it('continues a loose list after a blank line', () => {
            streamParity(['- a\n\n', '- b\n'])
        })

        it('still closes a list when a paragraph follows the blank line', () => {
            streamParity(['- a\n\n', 'para\n'])
        })

        it('continues an ordered list with blank lines and a nested bullet', () => {
            streamParity(['1. a\n\n', '2. b\n', '   - c\n\n', '3. d\n'])
        })

        it('continues an indented code block after a blank line', () => {
            streamParity(['    code1\n\n', '    code2\n'])
        })

        it('keeps a list open while the block after its blank line is still the last token', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            // `list space paragraph("2")`: the paragraph may still become an item.
            parser.update('1. first\n\n2')
            expect(asInternalParser(parser).getTailWindowBoundary()).toEqual({
                prefixCount: 0,
                reparseOffset: 0
            })
            // Once another token follows that block, the list joins the prefix.
            parser.update('- a\n\npara\n\nmore')
            expect(asInternalParser(parser).getTailWindowBoundary().prefixCount).toBe(4)
        })

        it('flags an unpaired HTML opening tag and clears once it closes', () => {
            const internal = asInternalParser(new IncrementalParser(createDefaultOptions()))
            const options = createDefaultOptions()
            const [open] = parseAndCacheModule.lexAndClean('<div>\n\n', options, false)
            const [attributed] = parseAndCacheModule.lexAndClean('<a href=/x/>\n\n', options, false)
            const [paired] = parseAndCacheModule.lexAndClean(
                '<div>\n\nb\n\n</div>\n',
                options,
                false
            )
            const [voidTag] = parseAndCacheModule.lexAndClean('<br>\n\n', options, false)
            const [selfClosed] = parseAndCacheModule.lexAndClean('<div/>\n\n', options, false)
            const [closing] = parseAndCacheModule.lexAndClean('</div>\n\n', options, false)
            expect(internal.hasHtmlSpanMismatch(open)).toBe(true)
            expect(internal.hasHtmlSpanMismatch(attributed)).toBe(true)
            expect(internal.hasHtmlSpanMismatch(paired)).toBe(false)
            expect(internal.hasHtmlSpanMismatch(voidTag)).toBe(false)
            expect(internal.hasHtmlSpanMismatch(selfClosed)).toBe(false)
            expect(internal.hasHtmlSpanMismatch(closing)).toBe(false)
        })

        it('regains the tail window after an HTML block with blank lines closes', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const chunks = [
                ...chunkBy('Intro.\n\n<div>\n\n**b**\n\n</div>\n\n', 5),
                'First after.\n\n',
                'Second after.\n\n',
                'Third after.\n\n'
            ]
            const usedTailWindow: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                const result = parser.update(source)
                usedTailWindow.push(result.usedTailWindow)
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
            }
            expect(usedTailWindow.slice(-2)).toEqual([true, true])
        })

        it.each([
            'Intro.\n\n<br>\n\n',
            'Intro.\n\n<hr>\n\n',
            'Intro.\n\n<img src="/a.png" alt="a">\n\n',
            'Intro.\n\n<br/>\n\n'
        ])('keeps using the tail window after a root-level void tag in %j', (head) => {
            // Cleanup rewrites `<br>` as `<br/>`; unless the token records its
            // true source length, the integrity guard sees a mismatch on
            // every later update and the document is re-lexed forever.
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const usedTailWindow: boolean[] = []
            let source = head
            parser.update(source)
            for (const chunk of ['First after.\n\n', 'Second after.\n\n', 'Third after.\n\n']) {
                source += chunk
                const result = parser.update(source)
                usedTailWindow.push(result.usedTailWindow)
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
            }
            expect(usedTailWindow).toEqual([true, true, true])
        })

        it.each([
            ['a bracket link', true, '<a href="x">open [t](/u)\n\n'],
            ['an image', true, '<a href="x">open ![i](/u)\n\n'],
            ['a reference link', true, '[r]: /ref\n\n<a href="x">open [t][r]\n\n'],
            ['a URL autolink', false, '<a href="x">open <https://b.example>\n\n'],
            ['an email autolink', false, '<a href="x">open <me@b.example>\n\n']
        ])(
            'after an unclosed anchor and %s, the tail window is used: %s',
            (_name, regained, head) => {
                // marked's `outputLink` (bracket links and images) resets
                // `inLink`; its autolink tokenizer does not, so the state is
                // still open and every later cut must be refused.
                const options = createDefaultOptions()
                const parser = new IncrementalParser(options)
                const usedTailWindow: boolean[] = []
                let source = head
                parser.update(source)
                for (const chunk of ['https://a.example\n\n', 'Second after.\n\n']) {
                    source += chunk
                    const result = parser.update(source)
                    usedTailWindow.push(result.usedTailWindow)
                    expectSemanticParity(
                        result.tokens,
                        parseAndCacheModule.lexAndClean(source, options, false),
                        source
                    )
                }
                expect(usedTailWindow).toEqual([regained, regained])
            }
        )

        it.each([1, 7, 32, 64])(
            'matches a fresh parse of the prose-mixed sections at chunk size %i',
            (size) => {
                streamParity(chunkBy(PROSE_MIXED, size))
            }
        )
    })

    describe('Targeted re-lex for a newly defined reference label', () => {
        const lexCalls = (spy: { mock: { calls: unknown[][] } }): string[] =>
            spy.mock.calls.map(([fragment]) => fragment as string)

        const plainParagraphs = (count: number, citing: Map<number, string>): string =>
            Array.from(
                { length: count },
                (_, index) =>
                    `${citing.get(index + 1) ?? `Paragraph ${index + 1} is plain prose that never cites anything at all.`}\n\n`
            ).join('')

        it('tripwire: a marked Lexer resolves references from a pre-seeded link map', () => {
            const lexer = new Lexer({ gfm: true })
            lexer.tokens.links = Object.assign(Object.create(null), {
                ref: { href: '/x', title: null }
            })

            const [paragraph] = lexer.lex('See [ref].')

            expect(paragraph).toMatchObject({
                type: 'paragraph',
                tokens: expect.arrayContaining([
                    expect.objectContaining({ type: 'link', href: '/x' })
                ])
            })
        })

        it('lexes fragments, not the whole document, when a definition resolves one citing paragraph', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const body = plainParagraphs(10, new Map([[3, 'Paragraph 3 cites [a] here.']]))
            let source = ''
            for (const chunk of body.match(/[\s\S]{1,40}/g) ?? []) {
                source += chunk
                parser.update(source)
            }

            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            source += '[a]: /docs\n'
            const result = parser.update(source)
            const fragments = lexCalls(lexSpy)
            lexSpy.mockRestore()

            expect(fragments.length).toBeGreaterThan(0)
            for (const fragment of fragments) {
                expect(fragment.length).toBeLessThan(source.length)
            }
            // Exactly the appended tail and the one citing paragraph.
            expect(fragments).toEqual(['\n\n[a]: /docs\n', 'Paragraph 3 cites [a] here.'])
            expect(result.reuseMode).toBe('tree')
            expect(result.usedTailWindow).toBe(true)
            expectSemanticParity(
                result.tokens,
                parseAndCacheModule.lexAndClean(source, options, false),
                source
            )
            expect(JSON.stringify(result.tokens)).toContain('"href":"/docs"')
        })

        /**
         * Streams `prefix` in 40-char chunks, then each of `appends`, asserting
         * semantic parity with a fresh full lex after EVERY update. Returns the
         * lexer inputs of the final append's update.
         */
        const streamThenAppend = (prefix: string, appends: string[]): string[] => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            let source = ''
            const step = (next: string): string[] => {
                const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
                source = next
                const result = parser.update(source)
                const fragments = lexCalls(lexSpy)
                lexSpy.mockRestore()
                expectSemanticParity(
                    result.tokens,
                    parseAndCacheModule.lexAndClean(source, options, false),
                    source
                )
                return fragments
            }
            for (const chunk of prefix.match(/[\s\S]{1,40}/g) ?? []) step(source + chunk)
            let fragments: string[] = []
            for (const append of appends) fragments = step(source + append)
            return fragments
        }

        it('matches a label with different case and whitespace', () => {
            // Single-line label: a use whose label spans a line break is not
            // detected as a reference use at all (pre-existing, see report).
            const body = plainParagraphs(8, new Map([[2, 'Paragraph 2 cites [Foo \t  Bar] here.']]))

            const fragments = streamThenAppend(body, ['[FOO bar]: /fb\n'])

            expect(fragments).toEqual([
                '\n\n[FOO bar]: /fb\n',
                'Paragraph 2 cites [Foo \t  Bar] here.'
            ])
        })

        it('re-lexes a citing list and blockquote as whole roots', () => {
            const body = plainParagraphs(
                8,
                new Map([
                    [2, '- first item\n- item citing [n]\n- last item'],
                    [5, '> quoted\n> and citing [n] too']
                ])
            )

            const fragments = streamThenAppend(body, ['[n]: /nested\n'])

            expect(fragments).toEqual([
                '\n\n[n]: /nested\n',
                '- first item\n- item citing [n]\n- last item',
                '> quoted\n> and citing [n] too'
            ])
        })

        it('handles two definitions arriving in one chunk', () => {
            const body = plainParagraphs(
                8,
                new Map([
                    [2, 'Cites [a] only.'],
                    [6, 'Cites [b] only.']
                ])
            )

            const fragments = streamThenAppend(body, ['[a]: /a\n[b]: /b\n'])

            expect(fragments).toEqual([
                '\n\n[a]: /a\n[b]: /b\n',
                'Cites [a] only.',
                'Cites [b] only.'
            ])
        })

        it('re-lexes no prefix root for a definition of an unused label', () => {
            const body = plainParagraphs(8, new Map([[3, 'Cites [used] here.']]))

            const fragments = streamThenAppend(body, ['[unused]: /nobody\n'])

            expect(fragments).toEqual(['\n\n[unused]: /nobody\n'])
        })

        it('keeps the first of duplicate definitions, in one chunk and across chunks', () => {
            const body = plainParagraphs(8, new Map([[3, 'Cites [dup] here.']]))
            const oneChunk = '[dup]: /first\n[dup]: /second\n'

            // marked drops the duplicate, so the targeted result's roots do
            // not add up to the source: it is discarded for a full re-lex
            // (plan 005), whose output is byte-identical to a one-shot parse.
            expect(streamThenAppend(body, [oneChunk])).toEqual([
                '\n\n[dup]: /first\n[dup]: /second\n',
                'Cites [dup] here.',
                body + oneChunk
            ])
            // The second definition arrives after the first is in the prefix:
            // it cannot change the link, so no prefix root is re-lexed on the
            // targeted path; the dropped duplicate still forces one full re-lex.
            const acrossChunks = streamThenAppend(body, [
                '[dup]: /first\n\nMore prose after the definition.\n\n',
                '[dup]: /second\n'
            ])
            expect(acrossChunks).toEqual([
                '\n\n[dup]: /second\n',
                `${body}[dup]: /first\n\nMore prose after the definition.\n\n[dup]: /second\n`
            ])
            expect(acrossChunks).not.toContain('Cites [dup] here.')
        })

        it('keeps parity while a definition URL and title stream character by character', () => {
            const body = plainParagraphs(
                10,
                new Map([
                    [2, 'First cite [1].'],
                    [7, 'Second cite [1] and [2].']
                ])
            )
            const definitions =
                '[1]: https://example.com/one "One title"\n[2]: <https://example.com/two>\n'

            const perChar = Array.from(definitions)
            const fragments = streamThenAppend(body, perChar)

            // The last update only appends the final newline of `[2]`.
            expect(fragments.every((fragment) => fragment.length < body.length)).toBe(true)
        })

        it('re-lexes a citing root that contains a nested definition as a fragment, keeping its definition', () => {
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const body = `${plainParagraphs(8, new Map([[2, '> [x]: /inner\n>\n> cites [a]']]))}`
            let source = ''
            for (const chunk of body.match(/[\s\S]{1,40}/g) ?? []) {
                source += chunk
                parser.update(source)
            }

            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            source += '[a]: /a\n'
            const result = parser.update(source)

            // The root is seeded without its own label `x`, so its lexer
            // re-registers `x` instead of dropping it as a duplicate.
            expect(lexCalls(lexSpy)).toEqual(['\n\n[a]: /a\n', '> [x]: /inner\n>\n> cites [a]'])
            expect(result.reuseMode).toBe('tree')
            expectSemanticParity(
                result.tokens,
                parseAndCacheModule.lexAndClean(source, options, false),
                source
            )
        })

        it('keeps parity at every chunk of the stream-compare citations corpus and never re-lexes it whole during definitions', () => {
            // Copy of `makeCitations(24_000)` from src/routes/test/stream-compare/+page.svelte.
            let definitions = '## Sources\n\n'
            for (let index = 1; index <= 40; index++) {
                definitions += `[${index}]: https://example.com/source/${index}\n`
            }
            let body = '# Findings\n\n'
            for (let paragraph = 0; body.length + definitions.length < 24_000; paragraph++) {
                const a = (paragraph % 40) + 1
                const b = ((paragraph + 7) % 40) + 1
                body += `Paragraph ${paragraph} summarises the **${a}th** result and its *follow-up* [${a}] before contrasting it with the replication study [${b}], which reported a slightly different \`effect\` size.\n\n`
            }
            const corpus = body + definitions
            const options = createDefaultOptions()
            const parser = new IncrementalParser(options)
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            let fullRelexesDuringDefinitions = 0

            for (let end = 32; end < corpus.length + 32; end += 32) {
                const source = corpus.slice(0, Math.min(end, corpus.length))
                lexSpy.mockClear()
                const result = parser.update(source)
                if (source.length > body.length && lexCalls(lexSpy).includes(source)) {
                    fullRelexesDuringDefinitions++
                }
                // Every chunk once definitions stream; every 8th before that
                // (the body alone is covered by the tail-window suites).
                if (source.length > body.length || end % 256 === 0) {
                    expectSemanticParity(
                        result.tokens,
                        parseAndCacheModule.lexAndClean(source, options, false),
                        source
                    )
                }
            }

            expect(fullRelexesDuringDefinitions).toBe(0)
        }, 30_000)
    })
})
