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
import { Lexer, Marked } from 'marked'

/**
 * Lexes markdown source and cleans the resulting tokens. Shared by sync and async paths.
 *
 * @param source - Raw markdown string to lex
 * @param options - Parser options forwarded to the Marked lexer
 * @param isInline - When true, uses inline tokenization (no block elements)
 * @returns Cleaned token array with HTML tokens properly nested
 *
 * @internal
 */
export const lexAndClean = (
    source: string,
    options: SvelteMarkdownOptions,
    isInline: boolean
): Token[] => {
    const lexer = new Lexer(options)
    const parsedTokens = isInline ? lexer.inlineTokens(source) : lexer.lex(source)
    return shrinkHtmlTokens(parsedTokens) as Token[]
}

/**
 * Parses markdown source with caching (synchronous path).
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
export const parseAndCacheTokens = (
    source: string,
    options: SvelteMarkdownOptions,
    isInline: boolean
): Token[] | TokensList => {
    // Check cache first - avoids expensive parsing
    const cached = tokenCache.getTokens(source, options)
    if (cached) {
        return cached
    }

    // Cache miss - parse and store
    const cleanedTokens = lexAndClean(source, options, isInline)

    if (typeof options.walkTokens === 'function') {
        cleanedTokens.forEach(options.walkTokens)
    }

    // Cache the cleaned tokens for next time
    tokenCache.setTokens(source, options, cleanedTokens)

    return cleanedTokens
}

/**
 * Parses markdown source with caching (async path).
 * Uses Marked's recursive walkTokens with Promise.all to properly
 * handle async walkTokens callbacks (e.g. marked-code-format).
 *
 * @param source - Raw markdown string to parse
 * @param options - Svelte markdown parser options
 * @param isInline - Whether to parse as inline markdown (no block elements)
 * @returns Promise resolving to cleaned and cached token array
 *
 * @example
 * ```typescript
 * import { parseAndCacheTokensAsync } from './parse-and-cache.js'
 *
 * const tokens = await parseAndCacheTokensAsync('# Hello', opts, false)
 * ```
 */
export const parseAndCacheTokensAsync = async (
    source: string,
    options: SvelteMarkdownOptions,
    isInline: boolean
): Promise<Token[] | TokensList> => {
    // Check cache first - avoids expensive parsing
    const cached = tokenCache.getTokens(source, options)
    if (cached) {
        return cached
    }

    // Cache miss - parse and store
    const cleanedTokens = lexAndClean(source, options, isInline)

    if (typeof options.walkTokens === 'function') {
        // Use Marked's recursive walkTokens which handles tables, lists,
        // nested tokens, and extension childTokens. Await all returned
        // promises so async walkTokens callbacks complete before caching.
        const marked = new Marked()
        marked.defaults = { ...marked.defaults, ...options }
        const results = marked.walkTokens(cleanedTokens, options.walkTokens)
        await Promise.all(results)
    }

    // Cache the cleaned tokens for next time
    tokenCache.setTokens(source, options, cleanedTokens)

    return cleanedTokens
}
