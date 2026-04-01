import type { SvelteMarkdownOptions } from '$lib/types.js'
import { IncrementalParser } from '$lib/utils/incremental-parser.js'
import type { Token } from '$lib/utils/markdown-parser.js'

export interface StreamBenchmarkResult {
    totalChars: number
    chunkCount: number
    totalParseMs: number
    peakParseMs: number
    p95ParseMs: number
    finalTokens: Token[]
    parseDurationsMs: number[]
}

/**
 * Calculates the p-th percentile of a numeric array.
 *
 * @param values - Array of numeric values
 * @param p - Percentile to calculate (0-1, e.g., 0.95 for 95th percentile)
 * @returns The value at the specified percentile, or 0 if array is empty
 */
const percentile = (values: number[], p: number): number => {
    if (values.length === 0) return 0

    const sorted = [...values].sort((a, b) => a - b)
    const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))

    return sorted[index]
}

/**
 * Benchmarks incremental parsing performance by simulating streaming chunk appends.
 *
 * @param chunks - Array of string chunks to append sequentially
 * @param options - SvelteMarkdown parser options forwarded to IncrementalParser
 * @returns Benchmark results including per-chunk timing, peak, and p95 parse durations
 *
 * @example
 * ```ts
 * const chunks = ['# Hello ', 'world, ', 'this is a test.']
 * const result = benchmarkAppendStream(chunks, { gfm: true })
 * console.log(result.p95ParseMs, result.peakParseMs)
 * ```
 */
export const benchmarkAppendStream = (
    chunks: string[],
    options: SvelteMarkdownOptions
): StreamBenchmarkResult => {
    const parser = new IncrementalParser(options)
    const parseDurationsMs: number[] = []
    let source = ''
    let finalTokens: Token[] = []

    for (const chunk of chunks) {
        source += chunk

        const start = performance.now()
        const result = parser.update(source)
        const elapsed = performance.now() - start

        parseDurationsMs.push(elapsed)
        finalTokens = result.tokens
    }

    const totalParseMs = parseDurationsMs.reduce((sum, duration) => sum + duration, 0)

    return {
        totalChars: source.length,
        chunkCount: chunks.length,
        totalParseMs,
        peakParseMs: parseDurationsMs.length > 0 ? Math.max(...parseDurationsMs) : 0,
        p95ParseMs: percentile(parseDurationsMs, 0.95),
        finalTokens,
        parseDurationsMs
    }
}
