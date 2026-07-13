/**
 * Token Cache
 *
 * Efficient caching layer for parsed markdown tokens.
 * Built on top of the existing MemoryCache infrastructure with
 * specialized features for markdown parsing optimization.
 *
 * Key features:
 * - Fast FNV-1a hashing for cache keys
 * - LRU eviction (inherited from MemoryCache)
 * - TTL support (inherited from MemoryCache)
 * - Handles large markdown documents efficiently
 *
 * @module token-cache
 */

import type { SvelteMarkdownOptions } from '$lib/types.js'
import { MemoryCache } from '$lib/utils/cache.js'
import type { Token, TokensList } from '$lib/utils/markdown-parser.js'

/**
 * Internal cache entry shape.
 *
 * The parsed tokens are stored alongside the exact source string that produced
 * them. Because cache keys are derived from a 32-bit FNV-1a hash (not
 * collision-resistant), a hit is only trusted when the stored `source` matches
 * the requested source — otherwise a hash collision could serve one document's
 * tokens for a different document. See {@link TokenCache.getTokens}.
 */
type TokenCacheEntry = {
    source: string
    // trunk-ignore(eslint/@typescript-eslint/no-redundant-type-constituents): TokensList resolves as an error type in CI's lint program; union matches the pre-existing getTokens/setTokens signatures
    tokens: Token[] | TokensList
}

/**
 * Fast non-cryptographic hash function using FNV-1a algorithm.
 * Optimized for speed over cryptographic security.
 *
 * FNV-1a (Fowler-Noll-Vo) provides:
 * - Fast computation (single pass through string)
 * - Good distribution (minimal collisions)
 * - Small output size (base36 string)
 *
 * @param str - String to hash
 * @returns Base36 hash string
 *
 * @example
 * ```typescript
 * const hash1 = hashString('# Hello World')
 * const hash2 = hashString('# Hello World!')
 * console.log(hash1 !== hash2) // true - different content = different hash
 * ```
 */
const hashString = (str: string): string => {
    let hash = 2166136261 // FNV offset basis (32-bit)

    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i)
        // FNV prime multiply using bit shifts (faster than multiplication)
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }

    // Convert to unsigned 32-bit integer and base36 string
    return (hash >>> 0).toString(36)
}

/**
 * Generates a cache key from markdown source and parser options.
 * Combines hashes of both source content and options to ensure
 * different parsing configurations are cached separately.
 *
 * Handles non-serializable options (extensions, tokenizer, hooks, etc.) by:
 * - Serializing functions by name/toString for stable keys
 * - Detecting and handling circular references
 * - Including ALL options that affect parsing
 *
 * @param source - Raw markdown string
 * @param options - Svelte markdown parser options
 * @returns Composite cache key
 *
 * @example
 * ```typescript
 * const key1 = getCacheKey('# Test', { gfm: true })
 * const key2 = getCacheKey('# Test', { gfm: false })
 * console.log(key1 !== key2) // true - different options = different key
 * ```
 */
// Memoizes the serialized hash of options objects by reference.
// Assumes options objects are treated as immutable — if a caller mutates
// an options object after it has been cached here, the stale hash will be
// returned and the token cache may serve incorrect results. Svelte 5's
// reactivity system creates new objects on prop changes ($derived), so
// this is safe for all internal usage paths.
const optionsHashCache = new WeakMap<object, string>()

const getCacheKey = (source: string, options: SvelteMarkdownOptions): string => {
    const sourceHash = hashString(source)

    let optionsHash = optionsHashCache.get(options)
    if (!optionsHash) {
        const seen = new WeakSet<object>()
        optionsHash = hashString(
            JSON.stringify(options, (_, value) => {
                if (typeof value === 'function') {
                    return value.name || value.toString()
                }
                if (value && typeof value === 'object') {
                    if (seen.has(value)) return '[Circular]'
                    seen.add(value)
                }
                return value
            })
        )
        optionsHashCache.set(options, optionsHash)
    }

    return `${sourceHash}:${optionsHash}`
}

/**
 * Specialized cache for markdown token storage.
 * Extends MemoryCache with markdown-specific convenience methods.
 *
 * Inherits from MemoryCache:
 * - Automatic LRU eviction when maxSize is reached
 * - TTL-based expiration for time-sensitive content
 * - Advanced deletion (deleteByPrefix, deleteByMagicString)
 *
 * Collision safety:
 * - Each entry stores the exact source string alongside its tokens. On a hit
 *   the stored source is compared to the requested source, so a 32-bit
 *   FNV-1a hash collision is treated as a miss rather than serving a
 *   different document's tokens (relevant under a shared SSR singleton).
 *
 * Performance characteristics:
 * - Cache hit: <1ms (vs 50-200ms parsing) plus one string comparison
 * - Memory: ~5MB of tokens for 50 cached documents (default maxSize); the
 *   retained source strings roughly double this for text-heavy documents
 * - Hash computation: ~0.05ms for 10KB, ~0.5ms for 100KB
 *
 * Note: the inherited raw `get()`/`set()` operate on the wrapped
 * {@link TokenCacheEntry} shape (`{ source, tokens }`), not on the bare token
 * array — use `getTokens`/`setTokens` for token access.
 *
 * @class TokenCache
 * @extends MemoryCache<TokenCacheEntry>
 *
 * @example
 * ```typescript
 * // Create cache with custom settings
 * const cache = new TokenCache({
 *     maxSize: 100,        // Cache up to 100 documents
 *     ttl: 5 * 60 * 1000  // Expire after 5 minutes
 * })
 *
 * // Check cache before parsing
 * const cached = cache.getTokens(markdown, options)
 * if (cached) {
 *     return cached // Fast path - no parsing needed
 * }
 *
 * // Parse and cache
 * const tokens = lexer.lex(markdown)
 * cache.setTokens(markdown, options, tokens)
 * ```
 */
export class TokenCache extends MemoryCache<TokenCacheEntry> {
    /**
     * Creates a new TokenCache instance.
     *
     * @param options - Cache configuration
     * @param options.maxSize - Maximum number of documents to cache (default: 50)
     * @param options.ttl - Time-to-live in milliseconds (default: 5 minutes)
     */
    constructor(options?: { maxSize?: number; ttl?: number }) {
        super({ maxSize: 50, ttl: 5 * 60 * 1000, ...options })
    }

    /**
     * Retrieves cached tokens for given markdown source and options.
     * Returns undefined if not cached or expired.
     *
     * @param source - Raw markdown string
     * @param options - Svelte markdown parser options
     * @returns Cached tokens or undefined
     *
     * @example
     * ```typescript
     * const tokens = cache.getTokens('# Hello', { gfm: true })
     * if (tokens) {
     *     console.log('Cache hit!')
     * }
     * ```
     */
    getTokens(source: string, options: SvelteMarkdownOptions): Token[] | TokensList | undefined {
        const key = getCacheKey(source, options)
        const entry = this.get(key)
        // Guard against 32-bit hash collisions: only trust a hit when the
        // stored source matches the requested source. On mismatch, treat it as
        // a miss — the parse path will re-parse and overwrite the colliding
        // entry (acceptable LRU behavior).
        if (entry === undefined || entry.source !== source) {
            return undefined
        }
        return entry.tokens
    }

    /**
     * Stores parsed tokens in cache for given markdown source and options.
     * If cache is full, oldest entry is evicted (LRU).
     *
     * @param source - Raw markdown string
     * @param options - Svelte markdown parser options
     * @param tokens - Parsed token array or token list
     *
     * @example
     * ```typescript
     * const tokens = lexer.lex(markdown)
     * cache.setTokens(markdown, options, tokens)
     * ```
     */
    setTokens(source: string, options: SvelteMarkdownOptions, tokens: Token[] | TokensList): void {
        const key = getCacheKey(source, options)
        // Store the source alongside the tokens so getTokens can verify a hit
        // against hash collisions.
        this.set(key, { source, tokens })
    }

    /**
     * Checks if tokens are cached without retrieving them.
     * Useful for cache statistics or conditional logic.
     *
     * @param source - Raw markdown string
     * @param options - Svelte markdown parser options
     * @returns True if cached and not expired
     *
     * @example
     * ```typescript
     * if (cache.hasTokens(markdown, options)) {
     *     console.log('Cache hit - no parsing needed')
     * }
     * ```
     */
    hasTokens(source: string, options: SvelteMarkdownOptions): boolean {
        const key = getCacheKey(source, options)
        return this.has(key)
    }

    /**
     * Removes cached tokens for specific source and options.
     *
     * @param source - Raw markdown string
     * @param options - Svelte markdown parser options
     * @returns True if entry was removed, false if not found
     *
     * @example
     * ```typescript
     * cache.deleteTokens(markdown, options) // Remove specific cached entry
     * ```
     */
    deleteTokens(source: string, options: SvelteMarkdownOptions): boolean {
        const key = getCacheKey(source, options)
        return this.delete(key)
    }

    /**
     * Removes all cached tokens from the cache.
     *
     * @example
     * ```typescript
     * cache.clearAllTokens() // Clear entire cache
     * ```
     */
    clearAllTokens(): void {
        this.clear()
    }
}

/**
 * Global singleton instance for shared token caching.
 * Use this instance across your application for maximum cache efficiency.
 *
 * @example
 * ```typescript
 * import { tokenCache } from './token-cache.js'
 *
 * const cached = tokenCache.getTokens(markdown, options)
 * if (!cached) {
 *     const tokens = lexer.lex(markdown)
 *     tokenCache.setTokens(markdown, options, tokens)
 * }
 * ```
 */
export const tokenCache = new TokenCache()

/**
 * Export hash function for testing purposes.
 * @internal
 */
export { hashString }
