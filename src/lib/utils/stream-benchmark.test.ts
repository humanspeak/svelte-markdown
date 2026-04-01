import type { SvelteMarkdownOptions } from '$lib/types.js'
import { describe, expect, it } from 'vitest'
import { lexAndClean } from './parse-and-cache.js'
import { benchmarkAppendStream } from './stream-benchmark.js'

describe('benchmarkAppendStream', () => {
    const options: SvelteMarkdownOptions = { gfm: true }

    it('matches a full parse for append-only prose streams', () => {
        const chunks = ['# Hello', '\n\n', 'This ', 'is ', '**streamed**', ' markdown.']
        const result = benchmarkAppendStream(chunks, options)
        const expected = lexAndClean(chunks.join(''), options, false)

        expect(result.chunkCount).toBe(chunks.length)
        expect(result.totalChars).toBe(chunks.join('').length)
        expect(result.finalTokens).toEqual(expected)
        expect(result.totalParseMs).toBeGreaterThanOrEqual(0)
        expect(result.peakParseMs).toBeGreaterThanOrEqual(0)
        expect(result.p95ParseMs).toBeGreaterThanOrEqual(0)
        expect(result.parseDurationsMs).toHaveLength(chunks.length)
    })

    it('matches a full parse for late-closing code fences', () => {
        const chunks = ['```ts\n', 'const value', ' = 1\n', '```']
        const result = benchmarkAppendStream(chunks, options)
        const expected = lexAndClean(chunks.join(''), options, false)

        expect(result.finalTokens).toEqual(expected)
        expect(result.finalTokens[0]?.type).toBe('code')
    })

    it('matches a full parse for table-heavy streams', () => {
        const chunks = ['| A | B |\n', '|---|---|\n', '| 1 | 2 |\n', '| 3 | 4 |']
        const result = benchmarkAppendStream(chunks, options)
        const expected = lexAndClean(chunks.join(''), options, false)

        expect(result.finalTokens).toEqual(expected)
        expect(result.finalTokens[0]?.type).toBe('table')
    })
})
