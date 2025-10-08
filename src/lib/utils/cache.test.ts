import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryCache, cached } from './cache.js'

describe('MemoryCache', () => {
    let cache: MemoryCache<string>

    beforeEach(() => {
        cache = new MemoryCache<string>()
    })

    describe('Constructor', () => {
        it('should create cache with default options', () => {
            const defaultCache = new MemoryCache<string>()
            expect(defaultCache).toBeInstanceOf(MemoryCache)
        })

        it('should create cache with custom maxSize', () => {
            const customCache = new MemoryCache<string>({ maxSize: 50 })
            expect(customCache).toBeInstanceOf(MemoryCache)
        })

        it('should create cache with custom TTL', () => {
            const customCache = new MemoryCache<string>({ ttl: 1000 })
            expect(customCache).toBeInstanceOf(MemoryCache)
        })

        it('should create cache with both custom options', () => {
            const customCache = new MemoryCache<string>({
                maxSize: 200,
                ttl: 2000
            })
            expect(customCache).toBeInstanceOf(MemoryCache)
        })
    })

    describe('set() and get()', () => {
        it('should set and get a value', () => {
            cache.set('key1', 'value1')
            expect(cache.get('key1')).toBe('value1')
        })

        it('should return undefined for non-existent key', () => {
            expect(cache.get('nonexistent')).toBeUndefined()
        })

        it('should overwrite existing value', () => {
            cache.set('key1', 'value1')
            cache.set('key1', 'value2')
            expect(cache.get('key1')).toBe('value2')
        })

        it('should handle different data types', () => {
            const numberCache = new MemoryCache<number>()
            const objectCache = new MemoryCache<{ name: string }>()
            const arrayCache = new MemoryCache<string[]>()

            numberCache.set('num', 42)
            objectCache.set('obj', { name: 'test' })
            arrayCache.set('arr', ['a', 'b', 'c'])

            expect(numberCache.get('num')).toBe(42)
            expect(objectCache.get('obj')).toEqual({ name: 'test' })
            expect(arrayCache.get('arr')).toEqual(['a', 'b', 'c'])
        })

        it('should handle empty string keys', () => {
            cache.set('', 'empty key value')
            expect(cache.get('')).toBe('empty key value')
        })

        it('should handle empty string values', () => {
            cache.set('empty', '')
            expect(cache.get('empty')).toBe('')
        })

        it('should handle null and undefined values', () => {
            const anyCache = new MemoryCache<any>()
            anyCache.set('null', null)
            anyCache.set('undefined', undefined)

            expect(anyCache.get('null')).toBeNull()
            expect(anyCache.get('undefined')).toBeUndefined()
        })

        it('should cache null and undefined values correctly', () => {
            const anyCache = new MemoryCache<any>()

            // Test that undefined is cached
            anyCache.set('undefined', undefined)
            expect(anyCache.get('undefined')).toBeUndefined()

            // Test that null is cached
            anyCache.set('null', null)
            expect(anyCache.get('null')).toBeNull()

            // Test that non-existent keys return undefined
            expect(anyCache.get('nonexistent')).toBeUndefined()
        })
    })

    describe('has()', () => {
        it('should return true for existing keys', () => {
            cache.set('key1', 'value1')
            expect(cache.has('key1')).toBe(true)
        })

        it('should return false for non-existent keys', () => {
            expect(cache.has('nonexistent')).toBe(false)
        })

        it('should return true for cached undefined values', () => {
            const anyCache = new MemoryCache<any>()
            anyCache.set('undefined', undefined)
            expect(anyCache.has('undefined')).toBe(true)
        })

        it('should return true for cached null values', () => {
            const anyCache = new MemoryCache<any>()
            anyCache.set('null', null)
            expect(anyCache.has('null')).toBe(true)
        })

        it('should return false for expired entries', () => {
            vi.useFakeTimers()
            const ttlCache = new MemoryCache<string>({ ttl: 1000 })

            ttlCache.set('key1', 'value1')
            expect(ttlCache.has('key1')).toBe(true)

            // Advance time past TTL
            vi.advanceTimersByTime(1001)
            expect(ttlCache.has('key1')).toBe(false)

            vi.useRealTimers()
        })
    })

    describe('TTL (Time To Live)', () => {
        beforeEach(() => {
            vi.useFakeTimers()
        })

        afterEach(() => {
            vi.useRealTimers()
        })

        it('should expire entries after TTL', () => {
            const ttlCache = new MemoryCache<string>({ ttl: 1000 })

            ttlCache.set('key1', 'value1')
            expect(ttlCache.get('key1')).toBe('value1')

            // Advance time past TTL
            vi.advanceTimersByTime(1001)
            expect(ttlCache.get('key1')).toBeUndefined()
        })

        it('should not expire entries before TTL', () => {
            const ttlCache = new MemoryCache<string>({ ttl: 1000 })

            ttlCache.set('key1', 'value1')

            // Advance time but not past TTL
            vi.advanceTimersByTime(999)
            expect(ttlCache.get('key1')).toBe('value1')
        })

        it('should handle zero TTL (no expiration)', () => {
            const ttlCache = new MemoryCache<string>({ ttl: 0 })

            ttlCache.set('key1', 'value1')
            vi.advanceTimersByTime(10000)
            expect(ttlCache.get('key1')).toBe('value1')
        })

        it('should handle negative TTL (no expiration)', () => {
            const ttlCache = new MemoryCache<string>({ ttl: -1000 })

            ttlCache.set('key1', 'value1')
            vi.advanceTimersByTime(10000)
            expect(ttlCache.get('key1')).toBe('value1')
        })

        it('should clean up expired entries on get', () => {
            const ttlCache = new MemoryCache<string>({ ttl: 1000 })

            ttlCache.set('key1', 'value1')
            ttlCache.set('key2', 'value2')

            vi.advanceTimersByTime(1001)

            // Getting key2 should not return key1 even though it's expired
            expect(ttlCache.get('key2')).toBeUndefined()
        })

        it('should refresh TTL when updating existing key', () => {
            vi.useFakeTimers()
            const ttlCache = new MemoryCache<string>({ ttl: 1000 })

            // Set initial value
            ttlCache.set('key1', 'value1')

            // Advance time by 500ms (halfway to expiration)
            vi.advanceTimersByTime(500)

            // Update the key with new value (should refresh TTL)
            ttlCache.set('key1', 'value1-updated')

            // Advance another 600ms (total: 1100ms from original set)
            // This exceeds the original TTL but not the refreshed one
            vi.advanceTimersByTime(600)

            // Should still be cached with updated value (TTL was refreshed)
            expect(ttlCache.get('key1')).toBe('value1-updated')

            // Advance past the refreshed TTL
            vi.advanceTimersByTime(500) // Total: 1600ms, exceeds refreshed TTL

            // Now it should be expired
            expect(ttlCache.get('key1')).toBeUndefined()

            vi.useRealTimers()
        })
    })

    describe('Max Size Eviction', () => {
        it('should evict oldest entry when max size is reached', () => {
            const sizeCache = new MemoryCache<string>({ maxSize: 2 })

            sizeCache.set('key1', 'value1')
            sizeCache.set('key2', 'value2')
            sizeCache.set('key3', 'value3') // Should evict key1

            expect(sizeCache.get('key1')).toBeUndefined()
            expect(sizeCache.get('key2')).toBe('value2')
            expect(sizeCache.get('key3')).toBe('value3')
        })

        it('should handle max size of 1', () => {
            const sizeCache = new MemoryCache<string>({ maxSize: 1 })

            sizeCache.set('key1', 'value1')
            sizeCache.set('key2', 'value2')

            expect(sizeCache.get('key1')).toBeUndefined()
            expect(sizeCache.get('key2')).toBe('value2')
        })

        it('should handle max size of 0 (no limit)', () => {
            const sizeCache = new MemoryCache<string>({ maxSize: 0 })

            // Add many entries
            for (let i = 0; i < 1000; i++) {
                sizeCache.set(`key${i}`, `value${i}`)
            }

            // All should still be there
            for (let i = 0; i < 1000; i++) {
                expect(sizeCache.get(`key${i}`)).toBe(`value${i}`)
            }
        })

        it('should handle negative max size (no limit)', () => {
            const sizeCache = new MemoryCache<string>({ maxSize: -1 })

            // Add many entries
            for (let i = 0; i < 1000; i++) {
                sizeCache.set(`key${i}`, `value${i}`)
            }

            // All should still be there
            for (let i = 0; i < 1000; i++) {
                expect(sizeCache.get(`key${i}`)).toBe(`value${i}`)
            }
        })

        it('should not evict when updating existing key', () => {
            const sizeCache = new MemoryCache<string>({ maxSize: 2 })

            sizeCache.set('key1', 'value1')
            sizeCache.set('key2', 'value2')
            sizeCache.set('key1', 'value1-updated') // Update existing key

            expect(sizeCache.get('key1')).toBe('value1-updated')
            expect(sizeCache.get('key2')).toBe('value2')
        })
    })

    describe('delete()', () => {
        it('should delete existing key and return true', () => {
            cache.set('key1', 'value1')
            expect(cache.delete('key1')).toBe(true)
            expect(cache.get('key1')).toBeUndefined()
        })

        it('should return false for non-existent key', () => {
            expect(cache.delete('nonexistent')).toBe(false)
        })

        it('should handle deleting already deleted key', () => {
            cache.set('key1', 'value1')
            cache.delete('key1')
            expect(cache.delete('key1')).toBe(false)
        })

        it('should handle deleting empty string key', () => {
            cache.set('', 'value')
            expect(cache.delete('')).toBe(true)
            expect(cache.get('')).toBeUndefined()
        })
    })

    describe('deleteAsync()', () => {
        it('should delete existing key and return true', async () => {
            cache.set('key1', 'value1')
            const result = await cache.deleteAsync('key1')
            expect(result).toBe(true)
            expect(cache.get('key1')).toBeUndefined()
        })

        it('should return false for non-existent key', async () => {
            const result = await cache.deleteAsync('nonexistent')
            expect(result).toBe(false)
        })

        it('should handle deleting already deleted key', async () => {
            cache.set('key1', 'value1')
            await cache.deleteAsync('key1')
            const result = await cache.deleteAsync('key1')
            expect(result).toBe(false)
        })
    })

    describe('clear()', () => {
        it('should remove all entries', () => {
            cache.set('key1', 'value1')
            cache.set('key2', 'value2')
            cache.set('key3', 'value3')

            cache.clear()

            expect(cache.get('key1')).toBeUndefined()
            expect(cache.get('key2')).toBeUndefined()
            expect(cache.get('key3')).toBeUndefined()
        })

        it('should handle clearing empty cache', () => {
            expect(() => cache.clear()).not.toThrow()
        })

        it('should allow setting new entries after clear', () => {
            cache.set('key1', 'value1')
            cache.clear()
            cache.set('key2', 'value2')
            expect(cache.get('key2')).toBe('value2')
        })
    })

    describe('deleteByPrefix()', () => {
        it('should delete entries with matching prefix', () => {
            cache.set('user:123:name', 'John')
            cache.set('user:123:email', 'john@example.com')
            cache.set('user:456:name', 'Jane')
            cache.set('post:789', 'Hello World')

            const removed = cache.deleteByPrefix('user:123:')

            expect(removed).toBe(2)
            expect(cache.get('user:123:name')).toBeUndefined()
            expect(cache.get('user:123:email')).toBeUndefined()
            expect(cache.get('user:456:name')).toBe('Jane')
            expect(cache.get('post:789')).toBe('Hello World')
        })

        it('should return 0 for non-matching prefix', () => {
            cache.set('user:123:name', 'John')
            cache.set('post:789', 'Hello World')

            const removed = cache.deleteByPrefix('nonexistent:')

            expect(removed).toBe(0)
            expect(cache.get('user:123:name')).toBe('John')
            expect(cache.get('post:789')).toBe('Hello World')
        })

        it('should handle empty prefix (matches all)', () => {
            cache.set('key1', 'value1')
            cache.set('key2', 'value2')

            const removed = cache.deleteByPrefix('')

            expect(removed).toBe(2)
            expect(cache.get('key1')).toBeUndefined()
            expect(cache.get('key2')).toBeUndefined()
        })

        it('should handle exact key match as prefix', () => {
            cache.set('exact', 'value')
            cache.set('exact:more', 'other')

            const removed = cache.deleteByPrefix('exact')

            expect(removed).toBe(2)
            expect(cache.get('exact')).toBeUndefined()
            expect(cache.get('exact:more')).toBeUndefined()
        })

        it('should handle special characters in prefix', () => {
            cache.set('user:123:name', 'John')
            cache.set('user:123:email', 'john@example.com')
            cache.set('user:456:name', 'Jane')

            const removed = cache.deleteByPrefix('user:123:')

            expect(removed).toBe(2)
            expect(cache.get('user:456:name')).toBe('Jane')
        })
    })

    describe('deleteByMagicString()', () => {
        it('should delete entries matching wildcard pattern', () => {
            cache.set('user:123:name', 'John')
            cache.set('user:123:email', 'john@example.com')
            cache.set('user:456:name', 'Jane')
            cache.set('post:789', 'Hello World')

            const removed = cache.deleteByMagicString('user:123:*')

            expect(removed).toBe(2)
            expect(cache.get('user:123:name')).toBeUndefined()
            expect(cache.get('user:123:email')).toBeUndefined()
            expect(cache.get('user:456:name')).toBe('Jane')
            expect(cache.get('post:789')).toBe('Hello World')
        })

        it('should handle multiple wildcards', () => {
            cache.set('user:123:name', 'John')
            cache.set('user:456:name', 'Jane')
            cache.set('user:123:email', 'john@example.com')
            cache.set('post:789', 'Hello World')

            const removed = cache.deleteByMagicString('user:*:name')

            expect(removed).toBe(2)
            expect(cache.get('user:123:name')).toBeUndefined()
            expect(cache.get('user:456:name')).toBeUndefined()
            expect(cache.get('user:123:email')).toBe('john@example.com')
            expect(cache.get('post:789')).toBe('Hello World')
        })

        it('should handle wildcard at start', () => {
            cache.set('user:123:name', 'John')
            cache.set('post:123:name', 'Post Name')
            cache.set('comment:123:name', 'Comment Name')

            const removed = cache.deleteByMagicString('*:123:name')

            expect(removed).toBe(3)
            expect(cache.get('user:123:name')).toBeUndefined()
            expect(cache.get('post:123:name')).toBeUndefined()
            expect(cache.get('comment:123:name')).toBeUndefined()
        })

        it('should handle wildcard at end', () => {
            cache.set('user:123:name', 'John')
            cache.set('user:123:email', 'john@example.com')
            cache.set('user:123:avatar', 'avatar.jpg')

            const removed = cache.deleteByMagicString('user:123:*')

            expect(removed).toBe(3)
            expect(cache.get('user:123:name')).toBeUndefined()
            expect(cache.get('user:123:email')).toBeUndefined()
            expect(cache.get('user:123:avatar')).toBeUndefined()
        })

        it('should handle multiple wildcards in sequence', () => {
            cache.set('user:123:name', 'John')
            cache.set('user:456:name', 'Jane')
            cache.set('post:123:title', 'Post Title')

            const removed = cache.deleteByMagicString('user:*:*')

            expect(removed).toBe(2)
            expect(cache.get('user:123:name')).toBeUndefined()
            expect(cache.get('user:456:name')).toBeUndefined()
            expect(cache.get('post:123:title')).toBe('Post Title')
        })

        it('should handle exact match with no wildcards', () => {
            cache.set('exact', 'value')
            cache.set('exact:more', 'other')

            const removed = cache.deleteByMagicString('exact')

            expect(removed).toBe(1)
            expect(cache.get('exact')).toBeUndefined()
            expect(cache.get('exact:more')).toBe('other')
        })

        it('should handle regex special characters', () => {
            cache.set('user.123.name', 'John')
            cache.set('user+123+name', 'Jane')
            cache.set('user*123*name', 'Bob')

            const removed = cache.deleteByMagicString('user.123.*')

            expect(removed).toBe(1)
            expect(cache.get('user.123.name')).toBeUndefined()
            expect(cache.get('user+123+name')).toBe('Jane')
            expect(cache.get('user*123*name')).toBe('Bob')
        })

        it('should handle empty pattern', () => {
            cache.set('key1', 'value1')
            cache.set('key2', 'value2')

            const removed = cache.deleteByMagicString('')

            expect(removed).toBe(0) // Empty pattern doesn't match anything
        })

        it('should return 0 for non-matching pattern', () => {
            cache.set('user:123:name', 'John')
            cache.set('post:789', 'Hello World')

            const removed = cache.deleteByMagicString('nonexistent:*')

            expect(removed).toBe(0)
            expect(cache.get('user:123:name')).toBe('John')
            expect(cache.get('post:789')).toBe('Hello World')
        })

        it('should handle complex patterns', () => {
            cache.set('api:v1:users:123:profile', 'Profile Data')
            cache.set('api:v1:users:456:profile', 'Other Profile')
            cache.set('api:v2:users:123:profile', 'V2 Profile')
            cache.set('api:v1:posts:123:content', 'Post Content')

            const removed = cache.deleteByMagicString('api:v1:users:*:profile')

            expect(removed).toBe(2)
            expect(cache.get('api:v1:users:123:profile')).toBeUndefined()
            expect(cache.get('api:v1:users:456:profile')).toBeUndefined()
            expect(cache.get('api:v2:users:123:profile')).toBe('V2 Profile')
            expect(cache.get('api:v1:posts:123:content')).toBe('Post Content')
        })
    })

    describe('Edge Cases and Error Handling', () => {
        it('should handle very large values', () => {
            const largeString = 'x'.repeat(1000000)
            cache.set('large', largeString)
            expect(cache.get('large')).toBe(largeString)
        })

        it('should handle many keys', () => {
            const manyCache = new MemoryCache<string>({ maxSize: 10000 })

            for (let i = 0; i < 1000; i++) {
                manyCache.set(`key${i}`, `value${i}`)
            }

            for (let i = 0; i < 1000; i++) {
                expect(manyCache.get(`key${i}`)).toBe(`value${i}`)
            }
        })

        it('should handle concurrent operations', () => {
            // This tests that the cache doesn't break under concurrent access
            const promises = []

            for (let i = 0; i < 100; i++) {
                promises.push(
                    Promise.resolve().then(() => {
                        cache.set(`key${i}`, `value${i}`)
                        return cache.get(`key${i}`)
                    })
                )
            }

            return Promise.all(promises).then((results) => {
                results.forEach((result: string | undefined, i: number) => {
                    expect(result).toBe(`value${i}`)
                })
            })
        })

        it('should handle unicode keys and values', () => {
            const unicodeKey = '🔑:测试:key'
            const unicodeValue = '🎉测试value🌟'

            cache.set(unicodeKey, unicodeValue)
            expect(cache.get(unicodeKey)).toBe(unicodeValue)
        })

        it('should handle very long keys', () => {
            const longKey = 'x'.repeat(10000)
            cache.set(longKey, 'value')
            expect(cache.get(longKey)).toBe('value')
        })
    })

    describe('Integration Tests', () => {
        it('should work with TTL and size limits together', () => {
            const integratedCache = new MemoryCache<string>({
                maxSize: 3,
                ttl: 1000
            })

            integratedCache.set('key1', 'value1')
            integratedCache.set('key2', 'value2')
            integratedCache.set('key3', 'value3')
            integratedCache.set('key4', 'value4') // Should evict key1

            expect(integratedCache.get('key1')).toBeUndefined()
            expect(integratedCache.get('key4')).toBe('value4')
        })

        it('should handle complex deletion scenarios', () => {
            cache.set('user:123:profile:name', 'John')
            cache.set('user:123:profile:email', 'john@example.com')
            cache.set('user:123:settings:theme', 'dark')
            cache.set('user:456:profile:name', 'Jane')
            cache.set('post:789:content', 'Hello World')

            // Delete all user:123 entries
            const removed1 = cache.deleteByMagicString('user:123:*')
            expect(removed1).toBe(3)

            // Delete all profile names
            const removed2 = cache.deleteByMagicString('user:*:profile:name')
            expect(removed2).toBe(1)

            // Verify remaining entries
            expect(cache.get('user:456:profile:name')).toBeUndefined()
            expect(cache.get('post:789:content')).toBe('Hello World')
        })
    })
})

describe('cached decorator', () => {
    describe('Basic functionality', () => {
        it('should cache method results', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(id: string): string {
                    this.callCount++
                    return `value-${id}`
                }
            }

            const instance = new TestClass()

            expect(instance.getValue('123')).toBe('value-123')
            expect(instance.getValue('123')).toBe('value-123')
            expect(instance.callCount).toBe(1) // Should only call once
        })

        it('should cache different arguments separately', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(id: string): string {
                    this.callCount++
                    return `value-${id}`
                }
            }

            const instance = new TestClass()

            expect(instance.getValue('123')).toBe('value-123')
            expect(instance.getValue('456')).toBe('value-456')
            expect(instance.callCount).toBe(2) // Should call for each unique argument
        })

        it('should handle complex arguments', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(id: string, options: { type: string }): string {
                    this.callCount++
                    return `value-${id}-${options.type}`
                }
            }

            const instance = new TestClass()

            expect(instance.getValue('123', { type: 'user' })).toBe('value-123-user')
            expect(instance.getValue('123', { type: 'user' })).toBe('value-123-user')
            expect(instance.callCount).toBe(1)
        })

        it('should handle async methods', async () => {
            class TestClass {
                callCount = 0

                @cached<Promise<string>>()
                async getValue(id: string): Promise<string> {
                    this.callCount++
                    return `value-${id}`
                }
            }

            const instance = new TestClass()

            const result1 = await instance.getValue('123')
            const result2 = await instance.getValue('123')

            expect(result1).toBe('value-123')
            expect(result2).toBe('value-123')
            expect(instance.callCount).toBe(1)
        })
    })

    describe('Cache options', () => {
        it('should respect TTL', async () => {
            // Ensure we're using real timers for this test
            vi.useRealTimers()

            class TestClass {
                callCount = 0

                @cached<string>({ ttl: 100 })
                getValue(id: string): string {
                    this.callCount++
                    return `value-${id}`
                }
            }

            const instance = new TestClass()

            expect(instance.getValue('123')).toBe('value-123')
            expect(instance.getValue('123')).toBe('value-123')
            expect(instance.callCount).toBe(1)

            // Wait for TTL to expire
            await new Promise((resolve) => setTimeout(resolve, 150))

            expect(instance.getValue('123')).toBe('value-123')
            expect(instance.callCount).toBe(2) // Should call again after TTL
        })

        it('should respect max size', () => {
            class TestClass {
                callCount = 0

                @cached<string>({ maxSize: 2 })
                getValue(id: string): string {
                    this.callCount++
                    return `value-${id}`
                }
            }

            const instance = new TestClass()

            // Fill cache
            instance.getValue('1')
            instance.getValue('2')
            instance.getValue('3') // Should evict '1'

            // Call '1' again - should not be cached
            instance.getValue('1')

            expect(instance.callCount).toBe(4) // Should call for '1' again
        })
    })

    describe('Edge cases', () => {
        it('should handle undefined arguments', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(id?: string): string {
                    this.callCount++
                    return `value-${id || 'undefined'}`
                }
            }

            const instance = new TestClass()

            expect(instance.getValue()).toBe('value-undefined')
            expect(instance.getValue()).toBe('value-undefined')
            expect(instance.callCount).toBe(1)
        })

        it('should handle null arguments', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(id: string | null): string {
                    this.callCount++
                    return `value-${id || 'null'}`
                }
            }

            const instance = new TestClass()

            expect(instance.getValue(null)).toBe('value-null')
            expect(instance.getValue(null)).toBe('value-null')
            expect(instance.callCount).toBe(1)
        })

        it('should handle circular references in arguments', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(obj: any): string {
                    this.callCount++
                    return `value-${obj.id}`
                }
            }

            const instance = new TestClass()
            const circularObj: any = { id: '123' }
            circularObj.self = circularObj

            expect(() => instance.getValue(circularObj)).toThrow()
        })

        it('should handle methods that return undefined', () => {
            class TestClass {
                callCount = 0

                @cached<string | undefined>()
                getValue(id: string): string | undefined {
                    this.callCount++
                    return id === 'valid' ? 'value' : undefined
                }
            }

            const instance = new TestClass()

            expect(instance.getValue('valid')).toBe('value')
            expect(instance.getValue('valid')).toBe('value')
            expect(instance.callCount).toBe(1)

            expect(instance.getValue('invalid')).toBeUndefined()
            expect(instance.getValue('invalid')).toBeUndefined()
            expect(instance.callCount).toBe(2)
        })

        it('should handle methods that return null', () => {
            class TestClass {
                callCount = 0

                @cached<string | null>()
                getValue(id: string): string | null {
                    this.callCount++
                    return id === 'valid' ? 'value' : null
                }
            }

            const instance = new TestClass()

            expect(instance.getValue('valid')).toBe('value')
            expect(instance.getValue('valid')).toBe('value')
            expect(instance.callCount).toBe(1)

            expect(instance.getValue('invalid')).toBeNull()
            expect(instance.getValue('invalid')).toBeNull()
            expect(instance.callCount).toBe(2)
        })
    })

    describe('Performance tests', () => {
        it('should handle many cached calls efficiently', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(id: string): string {
                    this.callCount++
                    return `value-${id}`
                }
            }

            const instance = new TestClass()

            // Make many calls with the same argument
            for (let i = 0; i < 1000; i++) {
                expect(instance.getValue('123')).toBe('value-123')
            }

            expect(instance.callCount).toBe(1) // Should only call once
        })

        it('should handle many unique calls efficiently', () => {
            class TestClass {
                callCount = 0

                @cached<string>()
                getValue(id: string): string {
                    this.callCount++
                    return `value-${id}`
                }
            }

            const instance = new TestClass()

            // Make many calls with different arguments
            for (let i = 0; i < 1000; i++) {
                expect(instance.getValue(`id-${i}`)).toBe(`value-id-${i}`)
            }

            expect(instance.callCount).toBe(1000) // Should call for each unique argument
        })
    })
})
