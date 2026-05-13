/**
 * Regression coverage for issue #291.
 *
 * The `IncrementalParser` tail-window optimization freezes the prefix of
 * `prevTokens` once new tokens are appended after them. That is unsound for
 * HTML block tokens: an opening `<div>` token emitted while the block is
 * still streaming will get frozen, and the parser can no longer merge it
 * with the eventual `</div>` into a single Type 6 HTML block.
 *
 * Symptom: streaming a nested HTML structure (e.g. `<div>` containing
 * `<strong>` and `<ul><li>...</li></ul>`) produces a structurally broken
 * token tree where the `<div>` ends up empty, children leak out as
 * siblings, list items become orphans, and some content appears
 * duplicated. The same source rendered without streaming parses correctly.
 *
 * Each test in this file streams a source word-by-word (or in another
 * realistic chunking strategy), then asserts that the final token tree
 * matches what a single-shot full parse of the same source produces.
 *
 * https://github.com/humanspeak/svelte-markdown/issues/291
 */

import type { SvelteMarkdownOptions } from '$lib/types.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import type { Token } from './markdown-parser.js'

const opts = (): SvelteMarkdownOptions => ({ gfm: true })

interface TreeNode {
    type: string
    tag?: string
    children: TreeNode[]
}

/**
 * Reduce a token tree to a comparable shape: type, tag, and recursive
 * child shapes. Drops `raw`, `text`, and other content fields so we
 * compare structure, not stringly-typed content.
 */
const summarize = (tokens: ReadonlyArray<Token>): TreeNode[] =>
    tokens.map((t) => {
        const tag = (t as Token & { tag?: string }).tag
        const kids = (t as Token & { tokens?: Token[] }).tokens
        return {
            type: t.type,
            ...(tag ? { tag } : {}),
            children: kids ? summarize(kids) : []
        } as TreeNode
    })

const singleShot = (source: string): Token[] => new IncrementalParser(opts()).update(source).tokens

/**
 * Stream `source` through a fresh `IncrementalParser` one chunk at a
 * time, accumulating into the running source. Returns the final token
 * array after all chunks have been processed.
 */
const streamChunked = (source: string, chunker: (s: string) => string[]): Token[] => {
    const parser = new IncrementalParser(opts())
    const chunks = chunker(source)
    let acc = ''
    let result: Token[] = []
    for (const chunk of chunks) {
        acc += chunk
        result = parser.update(acc).tokens
    }
    return result
}

const byWords = (s: string): string[] => s.match(/\S+\s*/g) ?? []
const byChars = (s: string): string[] => Array.from(s)
const byHtmlTags = (s: string): string[] => {
    const out: string[] = []
    const re = /(<\/?[a-zA-Z][^>]*>)|([^<]+)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(s)) !== null) out.push(m[0])
    return out
}

describe('IncrementalParser — streaming nested HTML (regression #291)', () => {
    describe('chunked stream should converge to single-shot shape', () => {
        const cases: Array<{ name: string; source: string }> = [
            {
                name: 'div with inline strong only',
                source: `<div style="background: #1e293b; padding: 16px">\n<strong>Verdict:</strong> ship it\n</div>`
            },
            {
                name: 'div with ul/li only (no other inline content)',
                source: `<div>\n<ul>\n<li>one</li>\n<li>two</li>\n<li>three</li>\n</ul>\n</div>`
            },
            {
                name: 'div with strong + ul/li (the primary bug reproducer)',
                source: `<div style="background: #1e293b">\n<strong>Verdict:</strong> ship it\n<ul>\n<li>URL allowlist covers all dangerous protocols</li>\n<li>Event handlers stripped before render</li>\n<li>Streaming-aware</li>\n</ul>\n</div>`
            },
            {
                name: 'div with nested table',
                source: `<div>\n<table>\n<tr><th>k</th><th>v</th></tr>\n<tr><td>a</td><td>1</td></tr>\n<tr><td>b</td><td>2</td></tr>\n</table>\n</div>`
            },
            {
                name: 'two sibling divs',
                source: `<div>\n<strong>first</strong>\n</div>\n<div>\n<strong>second</strong>\n</div>`
            },
            {
                name: 'div containing details/summary block',
                source: `<div>\n<details>\n<summary>title</summary>\n<p>body content here</p>\n</details>\n</div>`
            },
            {
                name: 'deeply nested (4 levels: section > article > div > p)',
                source: `<section>\n<article>\n<header>\n<h2>Title</h2>\n</header>\n<div>\n<p>Body paragraph</p>\n<p>Second paragraph</p>\n</div>\n<footer>\n<small>Footer</small>\n</footer>\n</article>\n</section>`
            }
        ]

        for (const { name, source } of cases) {
            it(`word-by-word: ${name}`, () => {
                const baseline = singleShot(source)
                const streamed = streamChunked(source, byWords)
                expect(summarize(streamed)).toEqual(summarize(baseline))
            })

            it(`tag-by-tag: ${name}`, () => {
                const baseline = singleShot(source)
                const streamed = streamChunked(source, byHtmlTags)
                expect(summarize(streamed)).toEqual(summarize(baseline))
            })
        }
    })

    describe('structural invariants for the primary bug reproducer', () => {
        const NESTED = `<div style="background: #1e293b">
<strong>Verdict:</strong> ship it
<ul>
<li>URL allowlist covers all dangerous protocols</li>
<li>Event handlers stripped</li>
<li>Streaming-aware</li>
</ul>
</div>`

        it('streamed result has exactly one top-level html:div token', () => {
            const streamed = streamChunked(NESTED, byWords)
            expect(streamed.length).toBe(1)
            const top = streamed[0] as Token & { tag?: string }
            expect(top.type).toBe('html')
            expect(top.tag).toBe('div')
        })

        it('the streamed div has the same direct-child count as the single-shot div', () => {
            const baseline = singleShot(NESTED)
            const streamed = streamChunked(NESTED, byWords)
            const baselineDiv = baseline[0] as Token & { tokens?: Token[] }
            const streamedDiv = streamed[0] as Token & { tokens?: Token[] }
            expect(streamedDiv.tokens?.length ?? 0).toBe(baselineDiv.tokens?.length ?? 0)
        })

        it('does not emit any orphan <li> tokens at the top level', () => {
            const streamed = streamChunked(NESTED, byWords)
            const orphans = streamed.filter(
                (t) => t.type === 'html' && (t as Token & { tag?: string }).tag === 'li'
            )
            expect(orphans).toEqual([])
        })

        it('does not duplicate list-item text content across multiple sibling tokens', () => {
            const streamed = streamChunked(NESTED, byWords)
            const allText: string[] = []
            const walk = (toks: ReadonlyArray<Token>): void => {
                for (const t of toks) {
                    const text = (t as Token & { text?: string }).text
                    const kids = (t as Token & { tokens?: Token[] }).tokens
                    if (text) allText.push(text)
                    if (kids) walk(kids)
                }
            }
            walk(streamed)
            const expectedOnce = 'Event handlers stripped'
            const occurrences = allText.filter((t) => t.includes(expectedOnce)).length
            expect(occurrences).toBe(1)
        })

        it('single-shot baseline shape itself is correct (sanity check)', () => {
            const tokens = singleShot(NESTED)
            expect(tokens.length).toBe(1)
            const div = tokens[0] as Token & { tag?: string; tokens?: Token[] }
            expect(div.tag).toBe('div')
            expect(div.tokens?.length ?? 0).toBeGreaterThan(0)
        })
    })

    describe('chunking variants of the primary reproducer', () => {
        const NESTED = `<div>\n<strong>Verdict:</strong> ship it\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n</div>`

        it('character-by-character stream converges to single-shot shape', () => {
            const baseline = singleShot(NESTED)
            const streamed = streamChunked(NESTED, byChars)
            expect(summarize(streamed)).toEqual(summarize(baseline))
        })

        it('whole-source single update equals single-shot (baseline sanity)', () => {
            const baseline = singleShot(NESTED)
            const streamed = streamChunked(NESTED, (s) => [s])
            expect(summarize(streamed)).toEqual(summarize(baseline))
        })
    })
})
