/**
 * Parse and Cache Utility
 *
 * Handles markdown parsing with intelligent caching.
 * Separates parsing logic from component code for better testability.
 *
 * @module parse-and-cache
 */

import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token, TokensList } from '$lib/utils/markdown-parser.js'
import { tokenCache } from '$lib/utils/token-cache.js'
import { shrinkHtmlTokens } from '$lib/utils/token-cleanup.js'
import { Lexer } from 'marked'

/**
 * Parses markdown source with caching.
 * Checks cache first, parses on miss, stores result, and returns tokens.
 *
 * @param source - Raw markdown string to parse
 * @param options - Svelte markdown parser options
 * @param isInline - Whether to parse as inline markdown (no block elements)
 * @returns Cleaned and cached token array
 *
 * @example
 * ```typescript
 * import { parseAndCacheTokens } from './parse-and-cache.js'
 *
 * // Parse markdown with caching
 * const tokens = parseAndCacheTokens('# Hello World', { gfm: true }, false)
 *
 * // Second call with same input returns cached result (<1ms)
 * const cachedTokens = parseAndCacheTokens('# Hello World', { gfm: true }, false)
 * ```
 */
export function parseAndCacheTokens(
    source: string,
    options: SvelteMarkdownOptions,
    isInline: boolean
): Token[] | TokensList {
    // Check cache first - avoids expensive parsing
    const cached = tokenCache.getTokens(source, options)
    if (cached) {
        return cached
    }

    // Cache miss - parse and store
    const lexer = new Lexer(options)
    const parsedTokens = isInline ? lexer.inlineTokens(source) : lexer.lex(source)

    const cleanedTokens = shrinkHtmlTokens(parsedTokens) as Token[]

    if (typeof options.walkTokens === 'function') {
        cleanedTokens.forEach(options.walkTokens)
    }

    // Cache the cleaned tokens for next time
    tokenCache.setTokens(source, options, cleanedTokens)

    return cleanedTokens
}
