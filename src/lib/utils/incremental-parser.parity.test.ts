/**
 * Streaming parity suite: a streamed parse must equal a one-shot parse of the
 * same cumulative source after EVERY chunk, whatever the chunk boundaries.
 *
 * Tests are bucketed by the mechanism that breaks parity, not by symptom:
 *
 *   A. Offset integrity  — marked consumed source without emitting a token of
 *                          the same length, so tail-window offset arithmetic
 *                          (`sourceLength - raw.length`) lands in the wrong place.
 *   B. Block boundaries  — a block was frozen into the reused prefix while the
 *                          next chunk could still continue or enclose it.
 *   C. Reference scope   — a definition the line-anchored detector cannot see
 *                          changed how earlier references resolve.
 *   D. Fuzz              — seeded random chunk boundaries over a corpus of
 *                          tricky documents; the tripwire for the next rewrite.
 *
 * `red` marks a known failure: the test asserts the CORRECT behavior and is
 * expected to fail until the fix lands. When a fix makes one pass, vitest
 * reports it as a failure ("expected to fail") — switch that test to `it`.
 * `it` tests in this file are guards that pass today and must keep passing.
 *
 * Run with `PARITY_STRICT=1` to see the real failure of every red test.
 */

import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token } from '$lib/utils/markdown-parser.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'
import { isSameStableNode, type ReusableStreamingNode } from './streaming-token-reuse.js'

// `PARITY_STRICT=1 pnpm vitest run <this file>` runs the red tests as normal
// tests, so their real failure messages are printed.
const red = process.env.PARITY_STRICT ? it : it.fails

const createOptions = (): SvelteMarkdownOptions => ({ gfm: true })

/** Compact shape of a root token array, for readable failure messages. */
const describeRoots = (tokens: Token[]): string =>
    tokens.map((token) => `${token.type}${JSON.stringify(token.raw)}`).join(' ')

/**
 * Index of the first root that differs between a streamed and a fresh parse,
 * or -1 when every root (and every nested field) is semantically equal.
 */
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

interface ParityFailure {
    chunkIndex: number
    source: string
    streamed: string
    fresh: string
}

/**
 * Streams `chunks` through one parser and returns the first chunk after which
 * the streamed tokens differ from a one-shot parse, or `undefined`.
 */
const findParityFailure = (chunks: string[]): ParityFailure | undefined => {
    const options = createOptions()
    const parser = new IncrementalParser(options)
    let source = ''
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        source += chunks[chunkIndex]
        const streamed = parser.update(source).tokens
        const fresh = lexAndClean(source, createOptions(), false)
        if (firstDivergence(streamed, fresh) !== -1) {
            return {
                chunkIndex,
                source,
                streamed: describeRoots(streamed),
                fresh: describeRoots(fresh)
            }
        }
    }
    return undefined
}

/** Asserts parity after every chunk, with the diverging state in the message. */
const expectParity = (chunks: string[]): void => {
    const failure = findParityFailure(chunks)
    expect(
        failure,
        failure &&
            `diverged after chunk ${failure.chunkIndex} at ${JSON.stringify(failure.source)}\n` +
                `  streamed: ${failure.streamed}\n  fresh:    ${failure.fresh}`
    ).toBeUndefined()
}

const chunkBy = (source: string, size: number): string[] => {
    const chunks: string[] = []
    for (let index = 0; index < source.length; index += size) {
        chunks.push(source.slice(index, index + size))
    }
    return chunks
}

describe('streaming parity', () => {
    describe('A. offset integrity (marked consumed source without a same-length token)', () => {
        red('CRLF line endings do not drop earlier content', () => {
            // marked normalizes `\r\n` to `\n`, so token raws are shorter than
            // the source span and the reparse offset lands past paragraph `a`.
            expectParity(chunkBy('a\r\n\r\nb', 3))
        })

        red('CRLF prose keeps parity at every chunk size', () => {
            const source = '# Title\r\n\r\nFirst paragraph.\r\n\r\n- one\r\n- two\r\n\r\nLast.\r\n'
            for (const size of [1, 2, 3, 5, 8]) expectParity(chunkBy(source, size))
        })

        it('a lone carriage return split from its line feed keeps parity (guard)', () => {
            expectParity(['first\r', '\n\r', '\nsecond\r\n'])
        })

        red('a duplicate reference definition does not leak its URL as text', () => {
            // marked consumes a duplicate `[label]:` without emitting a token.
            expectParity([
                'See [1] for details.\n\n[1]: https://a.example\n\nSome prose.\n\n',
                '[1]: https://b.exam',
                'ple',
                '\n\nFinal paragraph.\n'
            ])
        })

        red('a duplicate definition streamed character by character keeps parity', () => {
            const head = 'See [a].\n\n[a]: /first\n\nProse.\n\n'
            expectParity([head, ...chunkBy('[a]: /second\n\nEnd.\n', 1)])
        })

        it('tabs inside list items keep parity (guard)', () => {
            expectParity(chunkBy('- a\n\t- nested\n- b\n\nAfter.\n', 4))
        })
    })

    describe('B. block boundaries (a block frozen while it could still grow)', () => {
        red('a loose ordered list stays one list when a boundary splits the marker', () => {
            // After chunk 1 the tokens are `list space paragraph("2")`: the
            // open paragraph hides that the list before the blank line can
            // still continue.
            expectParity(['1. first\n\n2', '. second\n\n3', '. third\n'])
        })

        it('a loose bullet list stays one list when a boundary splits the marker (guard)', () => {
            // A lone `-` already lexes as an empty list item, so the list stays open.
            expectParity(['- first\n\n-', ' second\n\n-', ' third\n'])
        })

        red('a loose ordered list keeps parity at every chunk size', () => {
            const source = '1. first\n\n2. second\n\n3. third\n\nAfter the list.\n'
            for (const size of [1, 2, 3, 4, 7]) expectParity(chunkBy(source, size))
        })

        red('an HTML block with blank lines nests its children', () => {
            // One-shot: a single `html` root whose children include `**b**`.
            // Streamed: `<div>` is frozen as a childless root before `</div>`
            // arrives, leaving three flat siblings.
            expectParity(['<div>\n\n', '**b**\n\n', '</div>\n'])
        })

        red('an HTML block with blank lines keeps parity at every chunk size', () => {
            const source = 'Intro.\n\n<div>\n\n**bold** inside\n\n- item\n\n</div>\n\nAfter.\n'
            for (const size of [1, 3, 5, 9]) expectParity(chunkBy(source, size))
        })

        red('nested HTML blocks with blank lines keep parity', () => {
            const source =
                '<details>\n\n<summary>More</summary>\n\nHidden **text**.\n\n</details>\n\nAfter.\n'
            for (const size of [2, 6, 11]) expectParity(chunkBy(source, size))
        })

        it('a list followed by a real paragraph still closes (guard)', () => {
            expectParity(['- a\n\n', 'A paragraph, not an item.\n\n', 'More.\n'])
        })

        it('a tight list keeps parity at every chunk size (guard)', () => {
            const source = '- one\n- two\n  - nested\n- three\n\nAfter.\n'
            for (const size of [1, 2, 5]) expectParity(chunkBy(source, size))
        })

        it('an HTML block without blank lines keeps parity (guard)', () => {
            expectParity(chunkBy('<div>\n**b**\n</div>\n\nAfter.\n', 4))
        })
    })

    describe('C. reference scope (definitions the line-anchored detector misses)', () => {
        red('a definition whose URL is on the next line resolves earlier uses', () => {
            expectParity(['See [a].\n\n', '[a]:\n', '/x\n'])
        })

        red('a definition nested in a blockquote resolves earlier uses', () => {
            expectParity(['See [one].\n\n', '> [one]: /in-quote\n'])
        })

        red('a definition nested in a list item resolves earlier uses', () => {
            expectParity(['See [two].\n\n', '- [two]: /in-list\n'])
        })

        red('a definition indented by four or more columns inside a container resolves', () => {
            expectParity(['See [deep].\n\n', '> - item\n>\n>   [deep]: /nested\n'])
        })

        red('a definition title arriving on the following line updates earlier uses', () => {
            // An append that starts with a line break is treated as not touching
            // the definition, so the title never reaches the citing link.
            expectParity(['See [r].\n\n[r]: /a', '\n"Title"\n', '\nAfter.\n'])
        })

        it('a plain definition after a use resolves (guard)', () => {
            expectParity(chunkBy('See [p] here.\n\n[p]: https://example.com/p\n', 3))
        })
    })

    describe('D. fuzz (seeded random chunk boundaries)', () => {
        /** Deterministic PRNG so every failure is reproducible from its seed. */
        const mulberry32 = (seed: number) => (): number => {
            seed = (seed + 0x6d2b79f5) | 0
            let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
            value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296
        }

        const randomChunks = (source: string, random: () => number): string[] => {
            const chunks: string[] = []
            let index = 0
            while (index < source.length) {
                const size = 1 + Math.floor(random() * 9)
                chunks.push(source.slice(index, index + size))
                index += size
            }
            return chunks
        }

        /** Documents that are already parity-clean: these must stay green. */
        const CLEAN_CORPUS: Record<string, string> = {
            prose: '# Title\n\nA paragraph with **bold**, *em*, `code` and a [link](https://x.y).\n\n> A quote.\n\nLast.\n',
            tightLists:
                '- one\n- two\n  - nested a\n  - nested b\n- three\n\n1. a\n2. b\n\nAfter.\n',
            fence: 'Before.\n\n```ts\nconst a = 1\n\nconst b = 2\n```\n\nAfter.\n',
            table: '| a | b |\n|---|:-:|\n| 1 | 2 |\n| 3 | 4 |\n\nAfter.\n',
            references:
                'See [one] and [two][2].\n\nMore [one].\n\n[one]: https://example.com/1\n[2]: https://example.com/2 "Two"\n',
            headings: '# A\n## B\n\n### C\n\n---\n\nText.\n'
        }

        /** Documents covering buckets A–C: red until those fixes land. */
        const TRICKY_CORPUS: Record<string, string> = {
            crlf: '# Title\r\n\r\nParagraph one.\r\n\r\n- a\r\n- b\r\n\r\nEnd.\r\n',
            looseOrdered: '1. first\n\n2. second\n\n3. third\n\nAfter.\n',
            looseBullets: '- first\n\n- second\n\n  continued\n\n- third\n\nAfter.\n',
            htmlBlankLines: 'Intro.\n\n<div>\n\n**b** and *i*\n\n</div>\n\nAfter.\n',
            duplicateDefinition:
                'See [1].\n\n[1]: https://a.example\n\nProse.\n\n[1]: https://b.example\n\nEnd.\n',
            nestedDefinition: 'See [q].\n\n> [q]: /in-quote\n\nEnd.\n',
            multiLineDefinition: 'See [m].\n\n[m]:\n/next-line\n\nEnd.\n'
        }

        const RUNS_PER_DOCUMENT = 40

        const fuzz = (corpus: Record<string, string>): string[] => {
            const failures: string[] = []
            for (const [name, source] of Object.entries(corpus)) {
                for (let seed = 1; seed <= RUNS_PER_DOCUMENT; seed++) {
                    const failure = findParityFailure(randomChunks(source, mulberry32(seed)))
                    if (failure) {
                        failures.push(
                            `${name} seed ${seed}: chunk ${failure.chunkIndex} at ` +
                                `${JSON.stringify(failure.source)}\n    streamed: ${failure.streamed}\n    fresh:    ${failure.fresh}`
                        )
                        break
                    }
                }
            }
            return failures
        }

        it('parity-clean documents stay clean under random chunking (guard)', () => {
            expect(fuzz(CLEAN_CORPUS)).toEqual([])
        })

        red('tricky documents keep parity under random chunking', () => {
            expect(fuzz(TRICKY_CORPUS)).toEqual([])
        })
    })
})
