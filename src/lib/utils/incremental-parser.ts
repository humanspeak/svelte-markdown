/**
 * Incremental Markdown Parser for Streaming
 *
 * Optimizes streaming scenarios (LLM token-by-token updates) by performing
 * a full re-parse but diffing the result against the previous token array.
 * Only changed/appended tokens are returned as updates, allowing Svelte to
 * skip re-rendering unchanged components.
 *
 * @module incremental-parser
 */

import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token } from '$lib/utils/markdown-parser.js'
import { lexAndClean } from '$lib/utils/parse-and-cache.js'

/**
 * Result of an incremental parse update.
 */
export interface IncrementalUpdateResult {
    /** The full new token array */
    tokens: Token[]
    /** Index of the first token that differs from the previous parse */
    divergeAt: number
}

/**
 * Streaming-optimized parser that performs full re-parses but diffs results
 * against the previous token array to minimize DOM updates.
 *
 * For append-only streaming (typical LLM use case), most tokens are identical
 * between updates. By comparing `raw` strings, we identify which tokens changed
 * so Svelte can skip re-rendering unchanged components.
 *
 * @example
 * ```typescript
 * const parser = new IncrementalParser({ gfm: true })
 *
 * // First update — all tokens are "new"
 * const r1 = parser.update('# Hello')
 * // r1.divergeAt === 0
 *
 * // Second update — heading unchanged, paragraph appended
 * const r2 = parser.update('# Hello\n\nWorld')
 * // r2.divergeAt === 1 (heading at index 0 unchanged)
 * ```
 */
export class IncrementalParser {
    /** Previous parse result for diffing */
    private prevTokens: Token[] = []

    /** Parser options passed to the Marked lexer */
    private options: SvelteMarkdownOptions

    /**
     * Creates a new incremental parser instance.
     *
     * @param options - Svelte markdown parser options forwarded to Marked's Lexer
     */
    constructor(options: SvelteMarkdownOptions) {
        this.options = options
    }

    /**
     * Parses the full source and diffs against the previous result.
     *
     * @param source - The full accumulated markdown source string
     * @returns The new tokens and the index where they diverge from the previous parse
     */
    update = (source: string): IncrementalUpdateResult => {
        const newTokens = lexAndClean(source, this.options, false)

        // Apply walkTokens if configured
        if (typeof this.options.walkTokens === 'function') {
            newTokens.forEach(this.options.walkTokens)
        }

        // Find first divergence point by comparing raw strings
        let divergeAt = 0
        const minLen = Math.min(this.prevTokens.length, newTokens.length)
        while (divergeAt < minLen) {
            if (this.prevTokens[divergeAt].raw !== newTokens[divergeAt].raw) break
            divergeAt++
        }

        this.prevTokens = newTokens
        return { tokens: newTokens, divergeAt }
    }

    /**
     * Resets the parser state. Call this when starting a new stream.
     */
    reset = () => {
        this.prevTokens = []
    }
}
