/**
 * Generative streaming parity: random documents assembled from markdown
 * building blocks, streamed with random chunk boundaries, must equal a
 * one-shot parse after EVERY chunk.
 *
 * This complements `incremental-parser.parity.test.ts`, whose cases were
 * written for known failure mechanisms. The blocks here are combined at
 * random, so block PAIRS nobody thought about (a definition followed by its
 * title line, a heading followed by an indented line, a duplicate definition
 * followed by HTML) are exercised too. Everything is seeded: a failure names
 * the document seed and chunking seed that reproduce it.
 *
 * `red` marks a known failure that asserts the CORRECT behavior; run with
 * `PARITY_STRICT=1` to see the real failures. None is red today (plan 005
 * closed the last gaps): when a new block exposes a failure, add it here and
 * mark the case `red` until the fix lands.
 */

import type { Token } from '$lib/utils/markdown-parser.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'
import { isSameStableNode, type ReusableStreamingNode } from './streaming-token-reuse.js'

const red = process.env.PARITY_STRICT ? it : it.fails

/** Deterministic PRNG so every failure is reproducible from its seeds. */
const mulberry32 = (seed: number) => (): number => {
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

const describeRoots = (tokens: Token[]): string =>
    tokens.map((token) => `${token.type}${JSON.stringify(token.raw)}`).join(' ')

const firstDivergence = (streamed: Token[], fresh: Token[]): number => {
    const shared = Math.min(streamed.length, fresh.length)
    for (let index = 0; index < shared; index++) {
        const same = isSameStableNode(
            streamed[index] as unknown as ReusableStreamingNode,
            fresh[index] as unknown as ReusableStreamingNode
        )
        if (!same) return index
    }
    return streamed.length === fresh.length ? -1 : shared
}

/** Blocks that are parity-clean in every combination tried so far. */
const CORE_BLOCKS = [
    '# Heading one\n\n',
    '## Heading two\n\n',
    'Plain paragraph with **bold** and `code`.\n\n',
    'See [a] and [b][two] and [c].\n\n',
    'Another cite [a], again [c].\n\n',
    '1. first\n\n2. second\n\n3. third\n\n',
    '- one\n- two\n  - nested\n- three\n\n',
    '- loose a\n\n- loose b\n\n  continued here\n\n',
    '10. ten\n11. eleven\n\n',
    '> quote line\n> more\n\n',
    '> [c]: /in-quote\n\n',
    '- [b]: /in-list\n\n',
    '```ts\nconst x = 1\n\nconst y = 2\n```\n\n',
    '| h1 | h2 |\n|---|---|\n| a | b |\n\n',
    '---\n\n',
    '<br>\n\n',
    '<hr>\n\n',
    '<div>\n\n**inside** div\n\n</div>\n\n',
    '<details>\n\n<summary>S</summary>\n\nBody [a].\n\n</details>\n\n',
    '<img src="/x.png" alt="x">\n\n',
    '<span>inline</span> after\n\n',
    '[two]: https://example.com/two "Two"\n\n',
    '[c]:\n/next-line-url\n\n',
    'Line one\r\nLine two\r\n\r\n',
    '2024 was a year.\n\n'
]

/** Blocks that expose the boundary gaps this suite was written to pin. */
const GAP_BLOCKS = [
    // A definition whose title arrives on the following line.
    '[d]: /d\n"Title on next line"\n\n',
    'Uses [d] late.\n\n',
    // A duplicate definition, directly followed by another block.
    '[a]: https://example.com/a\n',
    '[a]: https://dup.example/a\n\n',
    // Blocks without a blank line after them, so the next block follows at once.
    '# Tight heading\n',
    '    indented code\n\n    more code\n\n',
    'Trailing text without newline',
    // Plan 005 additions: block pairs not covered above.
    'Setext heading\n===\n\n',
    'Tight setext\n---\n',
    '| t1 | t2 |\n|---|---|\n| x | y |\nText right after the table\n\n',
    '> quoted\n    indented after the quote\n\n',
    '9. nine\n10. ten\n\n',
    '~~~\ntilde fence\n\n~~~\n\n',
    '<https://example.com/auto>\n\n',
    "[e]: /e\n  'Single title'\n(not a title)\n\n",
    '[f]:\n/f\n(Paren title)\n',
    '[g]: /g\nProse right after a definition\n\n',
    'Lazy paragraph\n    continuation line\n\n',
    '  \n   \n'
]

const CHUNK_LIMITS = [1, 2, 3, 5, 9, 17, 40]

/** Generous: every update is checked against a fresh lex of the whole source. */
const FUZZ_TIMEOUT_MS = 60_000

interface FuzzOptions {
    blocks: string[]
    documents: number
    chunkingsPerDocument: number
    /**
     * Use each block at most once per document. Repeating a definition block
     * creates a duplicate definition, which is a gap case, not a core one.
     */
    unique?: boolean
}

/** Returns one message per failing document (the first diverging update). */
const fuzz = ({ blocks, documents, chunkingsPerDocument, unique }: FuzzOptions): string[] => {
    const failures: string[] = []
    for (let documentSeed = 1; documentSeed <= documents; documentSeed++) {
        const pick = mulberry32(documentSeed * 7919)
        const blockCount = 3 + Math.floor(pick() * 8)
        const available = [...blocks]
        let document = ''
        for (let index = 0; index < blockCount && available.length > 0; index++) {
            const at = Math.floor(pick() * available.length)
            document += available[at]
            if (unique) available.splice(at, 1)
        }

        const failure = findFailure(document, documentSeed, chunkingsPerDocument)
        if (failure) failures.push(failure)
    }
    return failures
}

const findFailure = (
    document: string,
    documentSeed: number,
    chunkingsPerDocument: number
): string | undefined => {
    for (let chunkingSeed = 1; chunkingSeed <= chunkingsPerDocument; chunkingSeed++) {
        const next = mulberry32(documentSeed * 104729 + chunkingSeed)
        const limit = CHUNK_LIMITS[chunkingSeed % CHUNK_LIMITS.length]
        const parser = new IncrementalParser({ gfm: true })
        let source = ''
        let offset = 0
        while (offset < document.length) {
            const size = 1 + Math.floor(next() * limit)
            source += document.slice(offset, offset + size)
            offset += size
            const streamed = parser.update(source).tokens
            const fresh = lexAndClean(source, { gfm: true }, false)
            const at = firstDivergence(streamed, fresh)
            if (at !== -1) {
                return (
                    `document ${documentSeed}, chunking ${chunkingSeed}, source ends ` +
                    `${JSON.stringify(source.slice(-40))}\n` +
                    `    streamed: ${describeRoots(streamed.slice(at, at + 3))}\n` +
                    `    fresh:    ${describeRoots(fresh.slice(at, at + 3))}`
                )
            }
        }
    }
    return undefined
}

describe('generative streaming parity', () => {
    it(
        'documents built from core blocks keep parity (guard)',
        () => {
            const failures = fuzz({
                blocks: CORE_BLOCKS,
                documents: 80,
                chunkingsPerDocument: 8,
                unique: true
            })
            expect(failures).toEqual([])
        },
        FUZZ_TIMEOUT_MS
    )

    it(
        'documents with repeated and boundary-gap blocks keep parity',
        () => {
            const blocks = [...CORE_BLOCKS, ...GAP_BLOCKS]
            expect(fuzz({ blocks, documents: 80, chunkingsPerDocument: 8 })).toEqual([])
        },
        FUZZ_TIMEOUT_MS
    )
})
