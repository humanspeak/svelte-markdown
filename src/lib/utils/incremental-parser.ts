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

interface TailWindowBoundary {
    prefixCount: number
    reparseOffset: number
}

const CLOSED_FENCE_RE = /^ {0,3}(`{3,}|~{3,}).*\n[\s\S]*\n {0,3}\1[ \t]*\n*$/
const LINK_REFERENCE_RE = /\[[^\]\n]+\]\[[^\]\n]*\]/
const SHORTCUT_REFERENCE_RE = /\[[^\]\n]+\](?![\[(])/ // Excludes inline links/images and full refs
const REFERENCE_DEFINITION_RE = /^\s{0,3}\[[^\]\n]+\]:/m

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

    /** Previous full source string for append-only tail reparsing */
    private prevSource = ''

    /** Parser options passed to the Marked lexer */
    private options: SvelteMarkdownOptions

    /** Whether caller-supplied parser hooks make tail-window reparsing unsafe */
    private tailWindowDisabled: boolean

    /**
     * Creates a new incremental parser instance.
     *
     * @param options - Svelte markdown parser options forwarded to Marked's Lexer
     */
    constructor(options: SvelteMarkdownOptions) {
        this.options = options
        this.tailWindowDisabled =
            typeof options.walkTokens === 'function' || options.tokenizer != null
    }

    private getTailWindowBoundary = (): TailWindowBoundary => {
        if (this.prevTokens.length === 0) {
            return { prefixCount: 0, reparseOffset: 0 }
        }

        let offset = 0
        for (let i = 0; i < this.prevTokens.length - 1; i++) {
            offset += this.prevTokens[i].raw.length
        }

        const lastToken = this.prevTokens[this.prevTokens.length - 1]

        if (this.isStableAtSourceEnd(lastToken)) {
            return {
                prefixCount: this.prevTokens.length,
                reparseOffset: this.prevSource.length
            }
        }

        return {
            prefixCount: this.prevTokens.length - 1,
            reparseOffset: offset
        }
    }

    private isStableAtSourceEnd = (token: Token): boolean => {
        if (token.type === 'space') return false
        if (token.raw.endsWith('\n\n')) return true

        switch (token.type) {
            case 'heading':
            case 'hr':
                return token.raw.endsWith('\n')
            case 'code':
                return CLOSED_FENCE_RE.test(token.raw)
            default:
                return false
        }
    }

    private hasAppendSensitiveReferenceSyntax = (source: string): boolean => {
        if (!source.includes('[') || !source.includes(']')) return false

        return (
            LINK_REFERENCE_RE.test(source) ||
            SHORTCUT_REFERENCE_RE.test(source) ||
            REFERENCE_DEFINITION_RE.test(source)
        )
    }

    private canUseTailWindow = (source: string, boundary: TailWindowBoundary): boolean => {
        if (this.tailWindowDisabled) return false
        if (this.prevSource === '' || this.prevTokens.length === 0) return false
        if (!source.startsWith(this.prevSource)) return false
        if (boundary.reparseOffset <= 0) return false

        const stablePrefix = this.prevSource.slice(0, boundary.reparseOffset)
        if (this.hasAppendSensitiveReferenceSyntax(stablePrefix)) return false

        return true
    }

    private parseSource = (source: string, boundary: TailWindowBoundary): Token[] => {
        if (!this.canUseTailWindow(source, boundary)) {
            return lexAndClean(source, this.options, false)
        }

        const tailTokens = lexAndClean(source.slice(boundary.reparseOffset), this.options, false)
        return [...this.prevTokens.slice(0, boundary.prefixCount), ...tailTokens]
    }

    /**
     * Parses the full source and diffs against the previous result.
     *
     * @param source - The full accumulated markdown source string
     * @returns The new tokens and the index where they diverge from the previous parse
     */
    update = (source: string): IncrementalUpdateResult => {
        const boundary = this.getTailWindowBoundary()
        const newTokens = this.parseSource(source, boundary)

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

        this.prevSource = source
        this.prevTokens = newTokens
        return { tokens: newTokens, divergeAt }
    }
}
