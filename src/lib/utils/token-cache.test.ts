import type { SvelteMarkdownOptions } from 'marked'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Token } from './markdown-parser'
import { TokenCache, hashString } from './token-cache'

describe('hashString', () => {
    it('should generate consistent hashes for same input', () => {
        const input = '# Hello World'
        const hash1 = hashString(input)
        const hash2 = hashString(input)
        expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different inputs', () => {
        const hash1 = hashString('# Hello World')
        const hash2 = hashString('# Hello World!')
        expect(hash1).not.toBe(hash2)
    })

    it('should handle empty strings', () => {
        const hash = hashString('')
        expect(typeof hash).toBe('string')
        expect(hash.length).toBeGreaterThan(0)
    })

    it('should handle large strings efficiently', () => {
        const largeString = '# Heading\n'.repeat(10000)
        const start = performance.now()
        const hash = hashString(largeString)
        const duration = performance.now() - start

        expect(typeof hash).toBe('string')
        expect(duration).toBeLessThan(10) // Should be very fast
    })

    it('should handle unicode characters', () => {
        const hash1 = hashString('测试')
        const hash2 = hashString('🔥🚀')
        expect(typeof hash1).toBe('string')
        expect(typeof hash2).toBe('string')
        expect(hash1).not.toBe(hash2)
    })
})

describe('TokenCache', () => {
    let cache: TokenCache

    beforeEach(() => {
        cache = new TokenCache()
    })

    describe('Constructor', () => {
        it('should create cache with default options', () => {
            const defaultCache = new TokenCache()
            expect(defaultCache).toBeInstanceOf(TokenCache)
        })

        it('should create cache with custom options', () => {
            const customCache = new TokenCache({ maxSize: 100, ttl: 60000 })
            expect(customCache).toBeInstanceOf(TokenCache)
        })
    })

    describe('getTokens() and setTokens()', () => {
        it('should cache and retrieve tokens', () => {
            const source = '# Hello World'
            const options: SvelteMarkdownOptions = { gfm: true }
            const tokens: Token[] = [
                { type: 'heading', raw: '# Hello World', depth: 1, text: 'Hello World' }
            ]

            cache.setTokens(source, options, tokens)
            const retrieved = cache.getTokens(source, options)

            expect(retrieved).toEqual(tokens)
        })

        it('should return undefined for non-cached content', () => {
            const result = cache.getTokens('# Not Cached', {})
            expect(result).toBeUndefined()
        })

        it('should cache different tokens for different sources', () => {
            const source1 = '# Heading 1'
            const source2 = '# Heading 2'
            const options: SvelteMarkdownOptions = {}
            const tokens1: Token[] = [
                { type: 'heading', raw: source1, depth: 1, text: 'Heading 1' }
            ]
            const tokens2: Token[] = [
                { type: 'heading', raw: source2, depth: 1, text: 'Heading 2' }
            ]

            cache.setTokens(source1, options, tokens1)
            cache.setTokens(source2, options, tokens2)

            expect(cache.getTokens(source1, options)).toEqual(tokens1)
            expect(cache.getTokens(source2, options)).toEqual(tokens2)
        })

        it('should cache different tokens for different options', () => {
            const source = '# Test'
            const options1: SvelteMarkdownOptions = { gfm: true }
            const options2: SvelteMarkdownOptions = { gfm: false }
            const tokens1: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test 2' }]

            cache.setTokens(source, options1, tokens1)
            cache.setTokens(source, options2, tokens2)

            expect(cache.getTokens(source, options1)).toEqual(tokens1)
            expect(cache.getTokens(source, options2)).toEqual(tokens2)
        })

        it('should handle empty markdown source', () => {
            const source = ''
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = []

            cache.setTokens(source, options, tokens)
            expect(cache.getTokens(source, options)).toEqual(tokens)
        })

        it('should handle large markdown documents', () => {
            const source = '# Heading\n\nParagraph text.\n\n'.repeat(1000)
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [
                { type: 'heading', raw: '# Large Doc', depth: 1, text: 'Large Doc' }
            ]

            const start = performance.now()
            cache.setTokens(source, options, tokens)
            const retrieved = cache.getTokens(source, options)
            const duration = performance.now() - start

            expect(retrieved).toEqual(tokens)
            expect(duration).toBeLessThan(10) // Should be fast
        })

        it('should handle unicode in markdown', () => {
            const source = '# 测试 🔥'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: '测试 🔥' }]

            cache.setTokens(source, options, tokens)
            expect(cache.getTokens(source, options)).toEqual(tokens)
        })
    })

    describe('hasTokens()', () => {
        it('should return true for cached tokens', () => {
            const source = '# Test'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            cache.setTokens(source, options, tokens)
            expect(cache.hasTokens(source, options)).toBe(true)
        })

        it('should return false for non-cached tokens', () => {
            expect(cache.hasTokens('# Not Cached', {})).toBe(false)
        })

        it('should return false after TTL expiration', () => {
            vi.useFakeTimers()
            const ttlCache = new TokenCache({ ttl: 1000 })
            const source = '# Test'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            ttlCache.setTokens(source, options, tokens)
            expect(ttlCache.hasTokens(source, options)).toBe(true)

            vi.advanceTimersByTime(1001)
            expect(ttlCache.hasTokens(source, options)).toBe(false)

            vi.useRealTimers()
        })
    })

    describe('deleteTokens()', () => {
        it('should delete cached tokens', () => {
            const source = '# Test'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            cache.setTokens(source, options, tokens)
            const deleted = cache.deleteTokens(source, options)

            expect(deleted).toBe(true)
            expect(cache.getTokens(source, options)).toBeUndefined()
        })

        it('should return false when deleting non-cached tokens', () => {
            const deleted = cache.deleteTokens('# Not Cached', {})
            expect(deleted).toBe(false)
        })

        it('should only delete specific source/options combination', () => {
            const source = '# Test'
            const options1: SvelteMarkdownOptions = { gfm: true }
            const options2: SvelteMarkdownOptions = { gfm: false }
            const tokens1: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test 1' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test 2' }]

            cache.setTokens(source, options1, tokens1)
            cache.setTokens(source, options2, tokens2)

            cache.deleteTokens(source, options1)

            expect(cache.getTokens(source, options1)).toBeUndefined()
            expect(cache.getTokens(source, options2)).toEqual(tokens2)
        })
    })

    describe('clearAllTokens()', () => {
        it('should clear all cached tokens', () => {
            const source1 = '# Test 1'
            const source2 = '# Test 2'
            const options: SvelteMarkdownOptions = {}
            const tokens1: Token[] = [{ type: 'heading', raw: source1, depth: 1, text: 'Test 1' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source2, depth: 1, text: 'Test 2' }]

            cache.setTokens(source1, options, tokens1)
            cache.setTokens(source2, options, tokens2)

            cache.clearAllTokens()

            expect(cache.getTokens(source1, options)).toBeUndefined()
            expect(cache.getTokens(source2, options)).toBeUndefined()
        })

        it('should allow caching after clear', () => {
            const source = '# Test'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            cache.setTokens(source, options, tokens)
            cache.clearAllTokens()
            cache.setTokens(source, options, tokens)

            expect(cache.getTokens(source, options)).toEqual(tokens)
        })
    })

    describe('TTL (Time To Live)', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('should expire tokens after TTL', () => {
            const ttlCache = new TokenCache({ ttl: 1000 })
            const source = '# Test'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            ttlCache.setTokens(source, options, tokens)
            expect(ttlCache.getTokens(source, options)).toEqual(tokens)

            vi.advanceTimersByTime(1001)
            expect(ttlCache.getTokens(source, options)).toBeUndefined()
        })

        it('should not expire tokens before TTL', () => {
            const ttlCache = new TokenCache({ ttl: 1000 })
            const source = '# Test'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            ttlCache.setTokens(source, options, tokens)

            vi.advanceTimersByTime(999)
            expect(ttlCache.getTokens(source, options)).toEqual(tokens)
        })
    })

    describe('Max Size Eviction', () => {
        it('should evict oldest entry when max size is reached', () => {
            const sizeCache = new TokenCache({ maxSize: 2 })
            const options: SvelteMarkdownOptions = {}

            const source1 = '# Test 1'
            const source2 = '# Test 2'
            const source3 = '# Test 3'
            const tokens1: Token[] = [{ type: 'heading', raw: source1, depth: 1, text: 'Test 1' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source2, depth: 1, text: 'Test 2' }]
            const tokens3: Token[] = [{ type: 'heading', raw: source3, depth: 1, text: 'Test 3' }]

            sizeCache.setTokens(source1, options, tokens1)
            sizeCache.setTokens(source2, options, tokens2)
            sizeCache.setTokens(source3, options, tokens3) // Should evict source1

            expect(sizeCache.getTokens(source1, options)).toBeUndefined()
            expect(sizeCache.getTokens(source2, options)).toEqual(tokens2)
            expect(sizeCache.getTokens(source3, options)).toEqual(tokens3)
        })

        it('should handle max size of 1', () => {
            const sizeCache = new TokenCache({ maxSize: 1 })
            const options: SvelteMarkdownOptions = {}

            const source1 = '# Test 1'
            const source2 = '# Test 2'
            const tokens1: Token[] = [{ type: 'heading', raw: source1, depth: 1, text: 'Test 1' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source2, depth: 1, text: 'Test 2' }]

            sizeCache.setTokens(source1, options, tokens1)
            sizeCache.setTokens(source2, options, tokens2)

            expect(sizeCache.getTokens(source1, options)).toBeUndefined()
            expect(sizeCache.getTokens(source2, options)).toEqual(tokens2)
        })
    })

    describe('Performance Tests', () => {
        it('should handle many cache operations efficiently', () => {
            const source = '# Test'
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            cache.setTokens(source, options, tokens)

            const start = performance.now()
            for (let i = 0; i < 1000; i++) {
                cache.getTokens(source, options)
            }
            const duration = performance.now() - start

            expect(duration).toBeLessThan(50) // Should be very fast
        })

        it('should handle many unique documents', () => {
            const options: SvelteMarkdownOptions = {}

            for (let i = 0; i < 100; i++) {
                const source = `# Heading ${i}`
                const tokens: Token[] = [
                    { type: 'heading', raw: source, depth: 1, text: `Heading ${i}` }
                ]
                cache.setTokens(source, options, tokens)
            }

            // Verify some are still cached (depending on maxSize)
            const cached = cache.getTokens('# Heading 99', options)
            expect(cached).toBeDefined()
        })
    })

    describe('Custom Extensions and Tokenizers', () => {
        it('should differentiate between different custom tokenizers', () => {
            const source = '# Test'

            // Use named functions with different implementations
            function customTokenizer1() {
                return { type: 'heading', raw: '', depth: 1, text: 'Custom1' }
            }
            function customTokenizer2() {
                return { type: 'heading', raw: '', depth: 2, text: 'Custom2' } // Different depth
            }

            const options1: SvelteMarkdownOptions = {
                tokenizer: { heading: customTokenizer1 }
            }
            const options2: SvelteMarkdownOptions = {
                tokenizer: { heading: customTokenizer2 }
            }

            const tokens1: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test 1' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test 2' }]

            cache.setTokens(source, options1, tokens1)
            cache.setTokens(source, options2, tokens2)

            // Should have separate cache entries (different function names/bodies)
            expect(cache.getTokens(source, options1)).toEqual(tokens1)
            expect(cache.getTokens(source, options2)).toEqual(tokens2)
        })

        it('should differentiate between options with and without extensions', () => {
            const source = '# Test'
            const optionsNoExt: SvelteMarkdownOptions = { gfm: true }
            const optionsWithExt: SvelteMarkdownOptions = {
                gfm: true,
                extensions: [{ name: 'custom', level: 'block' }]
            }

            const tokens1: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'No Ext' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'With Ext' }]

            cache.setTokens(source, optionsNoExt, tokens1)
            cache.setTokens(source, optionsWithExt, tokens2)

            // Should have separate cache entries
            expect(cache.getTokens(source, optionsNoExt)).toEqual(tokens1)
            expect(cache.getTokens(source, optionsWithExt)).toEqual(tokens2)
        })

        it('should handle circular references in options', () => {
            const source = '# Test'
            /* trunk-ignore(eslint/@typescript-eslint/no-explicit-any) */
            const circularOptions: any = { gfm: true }
            circularOptions.self = circularOptions // Create circular reference

            // Should not throw error
            expect(() => {
                const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]
                cache.setTokens(source, circularOptions, tokens)
                cache.getTokens(source, circularOptions)
            }).not.toThrow()
        })
    })

    describe('Edge Cases', () => {
        it('should handle very long markdown', () => {
            const source = '# Heading\n\n'.repeat(100000) // ~1.2MB
            const options: SvelteMarkdownOptions = {}
            const tokens: Token[] = [{ type: 'heading', raw: '# Test', depth: 1, text: 'Test' }]

            const start = performance.now()
            cache.setTokens(source, options, tokens)
            const retrieved = cache.getTokens(source, options)
            const duration = performance.now() - start

            expect(retrieved).toEqual(tokens)
            expect(duration).toBeLessThan(100) // Should still be reasonably fast
        })

        it('should handle complex options objects', () => {
            const source = '# Test'
            const options: SvelteMarkdownOptions = {
                gfm: true,
                breaks: true,
                pedantic: false,
                sanitize: false,
                smartLists: true,
                smartypants: true
            }
            const tokens: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test' }]

            cache.setTokens(source, options, tokens)
            expect(cache.getTokens(source, options)).toEqual(tokens)
        })

        it('should treat similar options as different', () => {
            const source = '# Test'
            const options1: SvelteMarkdownOptions = { gfm: true }
            const options2: SvelteMarkdownOptions = { gfm: true, breaks: false }
            const tokens1: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test 1' }]
            const tokens2: Token[] = [{ type: 'heading', raw: source, depth: 1, text: 'Test 2' }]

            cache.setTokens(source, options1, tokens1)
            cache.setTokens(source, options2, tokens2)

            expect(cache.getTokens(source, options1)).toEqual(tokens1)
            expect(cache.getTokens(source, options2)).toEqual(tokens2)
        })
    })
})
