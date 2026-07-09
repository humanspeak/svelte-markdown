import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token } from '$lib/utils/markdown-parser.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import * as parseAndCacheModule from './parse-and-cache.js'

/** Private surface of `IncrementalParser` exercised by the tail-window tests. */
interface InternalParser {
    prevTokens: Token[]
    prevSource: string
    getTailWindowBoundary: () => { prefixCount: number; reparseOffset: number }
    hasHtmlSpanMismatch: (token: Token) => boolean
    hasPotentialReferenceUse: (source: string) => boolean
    hasReferenceDefinition: (source: string) => boolean
    appendIntroducesMatch: (source: string, matches: (_candidate: string) => boolean) => boolean
    canUseTailWindow: (
        source: string,
        boundary: { prefixCount: number; reparseOffset: number }
    ) => boolean
}

/** Expose the private tail-window internals without repeating the cast per test. */
const asInternalParser = (parser: IncrementalParser): InternalParser =>
    parser as unknown as InternalParser

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
            expect(result.divergeAt).toBe(0)
        })

        it('disables stable token reuse for in-place source edits', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            parser.update('<div><span>abc</span></div>')

            const result = parser.update('<div><span>xyz</span></div>')

            expect(result.canReuse).toBe(false)
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

        it('falls back to a full re-lex when reference-style syntax could change the prefix', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const parser = new IncrementalParser(createDefaultOptions())
            const source = '[foo]\n\nTail'
            const appended = `${source}\n\n[foo]: /docs`

            parser.update(source)
            const result = parser.update(appended)

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended)
            expect(result.divergeAt).toBe(0)
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

            expect(lexSpy.mock.calls[1]?.[0]).toBe(withDefinition)
            expect(boundary.reparseOffset).toBeGreaterThan(0)
            expect(internalParser.canUseTailWindow(appended, boundary)).toBe(true)

            const result = parser.update(appended)

            expect(lexSpy.mock.calls[2]?.[0]).toBe(appended.slice(boundary.reparseOffset))
            const reparsedTail = lexSpy.mock.calls[2]?.[0] ?? ''
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

        it('falls back to a full re-lex when reference syntax is split across chunks', () => {
            const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
            const options = createDefaultOptions()

            const splitUseParser = new IncrementalParser(options)
            splitUseParser.update('See [do')
            splitUseParser.update('See [docs]\n\nTail')
            const splitUseWithDefinition = 'See [docs]\n\nTail\n\n[docs]: /docs'

            splitUseParser.update(splitUseWithDefinition)

            expect(lexSpy.mock.calls[2]?.[0]).toBe(splitUseWithDefinition)

            lexSpy.mockClear()

            const splitDefinitionParser = new IncrementalParser(options)
            splitDefinitionParser.update('See [docs]\n\nTail')
            splitDefinitionParser.update('See [docs]\n\nTail\n\n[do')
            const splitDefinition = 'See [docs]\n\nTail\n\n[docs]: /docs'

            splitDefinitionParser.update(splitDefinition)

            expect(lexSpy.mock.calls[2]?.[0]).toBe(splitDefinition)
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

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended)
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
    })

    describe('Streaming Bookkeeping Performance', () => {
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

            expect(lexSpy.mock.calls[1]?.[0]).toBe(appended)
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

        it('scans the definition boundary at most once per append', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            // A reference use is present but its definition has not arrived yet:
            // the state where the tail-window decision and the cached-state
            // refresh both need to know whether the append added a definition.
            parser.update('See [docs]\n\n')

            const internalParser = asInternalParser(parser)
            const originalAppendIntroducesMatch = internalParser.appendIntroducesMatch
            const definitionMatcher = internalParser.hasReferenceDefinition
            let definitionBoundaryScans = 0

            internalParser.appendIntroducesMatch = (scannedSource, matches) => {
                if (matches === definitionMatcher) definitionBoundaryScans++
                return originalAppendIntroducesMatch(scannedSource, matches)
            }

            parser.update('See [docs]\n\nmore streamed text')

            expect(definitionBoundaryScans).toBe(1)
        })

        it('reuses the cached definition flag instead of rescanning prevSource on in-place edits', () => {
            const parser = new IncrementalParser(createDefaultOptions())
            const source = `${Array.from({ length: 60 }, (_, index) => `See [ref${index}]`).join(
                '\n\n'
            )}\n\n[ref0]: /a`

            parser.update(source)

            const internalParser = asInternalParser(parser)
            const originalHasReferenceDefinition = internalParser.hasReferenceDefinition
            const scannedLengths: number[] = []

            internalParser.hasReferenceDefinition = (scannedSource) => {
                scannedLengths.push(scannedSource.length)
                return originalHasReferenceDefinition(scannedSource)
            }

            // Non-append (in-place) edit: the reference-sensitivity check must
            // read the cached flag for the previous source rather than rescan it.
            parser.update('Rewritten [ref0] content\n\n[ref0]: /b')

            expect(Math.max(...scannedLengths)).toBeLessThan(source.length)
        })
    })
})
