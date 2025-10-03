/**
 * Configuration options for cache initialization.
 *
 * @interface CacheOptions
 * @property {number} [maxSize] - Maximum number of entries the cache can hold before evicting oldest entries
 * @property {number} [ttl] - Time-to-live in milliseconds for cache entries before they expire
 */
type CacheOptions = {
    maxSize?: number
    ttl?: number // milliseconds
}

/**
 * Internal representation of a cached entry with its metadata.
 *
 * @interface CacheEntry
 * @template T - The type of value being cached
 * @property {T} value - The actual cached value
 * @property {number} timestamp - Unix timestamp when the entry was created
 */
type CacheEntry<T> = {
    value: T
    timestamp: number
}

/**
 * Special sentinel values to represent cached undefined/null values.
 * This allows us to distinguish between "not cached" and "cached undefined/null".
 */
const CACHED_UNDEFINED = Symbol('CACHED_UNDEFINED')
const CACHED_NULL = Symbol('CACHED_NULL')

/**
 * Generic in-memory cache implementation with TTL and size-based eviction.
 * Provides efficient caching for any type of data with automatic cleanup
 * of expired or excess entries.
 *
 * @class MemoryCache
 * @template T - The type of values being cached
 *
 * @example
 * ```typescript
 * // Create a cache for string values
 * const cache = new MemoryCache<string>({
 *     maxSize: 100,
 *     ttl: 5 * 60 * 1000 // 5 minutes
 * });
 *
 * // Store and retrieve values
 * cache.set('key', 'value');
 * const value = cache.get('key');
 * ```
 */
export class MemoryCache<T> {
    private cache: Map<string, CacheEntry<T | typeof CACHED_UNDEFINED | typeof CACHED_NULL>> =
        new Map()
    private maxSize: number
    private ttl: number

    /**
     * Creates a new MemoryCache instance.
     *
     * @param {CacheOptions} options - Configuration options for the cache
     * @param {number} [options.maxSize=100] - Maximum number of entries (default: 100)
     * @param {number} [options.ttl=300000] - Time-to-live in milliseconds (default: 5 minutes)
     */
    constructor(options: CacheOptions = {}) {
        this.maxSize = options.maxSize ?? 100
        this.ttl = options.ttl ?? 5 * 60 * 1000 // 5 minutes default
    }

    /**
     * Retrieves a value from the cache if it exists and hasn't expired.
     *
     * @param {string} key - The key to look up
     * @returns {T | undefined} The cached value if found and valid, undefined otherwise
     *
     * @example
     * ```typescript
     * const cache = new MemoryCache<number>();
     * cache.set('counter', 42);
     * const value = cache.get('counter'); // Returns 42
     * const missing = cache.get('nonexistent'); // Returns undefined
     * ```
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key)
        if (!entry) return undefined

        // Check if entry has expired (skip check if TTL is 0 or negative)
        if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key)
            return undefined
        }

        // Handle the special sentinel values for cached undefined/null
        if (entry.value === CACHED_UNDEFINED) {
            return undefined
        }
        if (entry.value === CACHED_NULL) {
            return null as T
        }

        return entry.value as T
    }

    /**
     * Checks if a key exists in the cache (regardless of its value).
     * This is useful for distinguishing between cache misses and cached undefined values.
     *
     * @param {string} key - The key to check
     * @returns {boolean} True if the key exists in cache and hasn't expired, false otherwise
     */
    has(key: string): boolean {
        const entry = this.cache.get(key)
        if (!entry) return false

        // Check if entry has expired (skip check if TTL is 0 or negative)
        if (this.ttl > 0 && Date.now() - entry.timestamp > this.ttl) {
            this.cache.delete(key)
            return false
        }

        return true
    }

    /**
     * Stores a value in the cache. If the cache is full, the oldest entry is removed.
     *
     * @param {string} key - The key under which to store the value
     * @param {T} value - The value to cache
     *
     * @example
     * ```typescript
     * const cache = new MemoryCache<string>();
     * cache.set('greeting', 'Hello, World!');
     * ```
     */
    set(key: string, value: T): void {
        // Remove oldest entry if cache is full (skip if maxSize is 0 or negative)
        if (this.maxSize > 0 && this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value
            if (oldestKey) {
                this.cache.delete(oldestKey)
            }
        }

        // Store undefined/null values as sentinels to distinguish from cache misses
        let valueToStore: T | typeof CACHED_UNDEFINED | typeof CACHED_NULL
        if (value === undefined) {
            valueToStore = CACHED_UNDEFINED
        } else if (value === null) {
            valueToStore = CACHED_NULL
        } else {
            valueToStore = value
        }

        this.cache.set(key, {
            value: valueToStore,
            timestamp: Date.now()
        })
    }

    /**
     * Removes a specific entry from the cache.
     *
     * @param {string} key - The key of the entry to remove
     * @returns {boolean} True if an element was removed, false if the key wasn't found
     *
     * @example
     * ```typescript
     * const cache = new MemoryCache<string>();
     * cache.set('key', 'value');
     * cache.delete('key'); // Returns true
     * cache.delete('nonexistent'); // Returns false
     * ```
     */
    delete(key: string): boolean {
        return this.cache.delete(key)
    }
    async deleteAsync(key: string): Promise<boolean> {
        return Promise.resolve(this.cache.delete(key))
    }

    /**
     * Removes all entries from the cache.
     *
     * @example
     * ```typescript
     * const cache = new MemoryCache<string>();
     * cache.set('key1', 'value1');
     * cache.set('key2', 'value2');
     * cache.clear(); // Removes all entries
     * ```
     */
    clear(): void {
        this.cache.clear()
    }

    /**
     * Removes all entries from the cache whose keys start with the given prefix.
     *
     * @param {string} prefix - The prefix to match against cache keys
     * @returns {number} Number of entries removed
     *
     * @example
     * ```typescript
     * const cache = new MemoryCache<string>();
     * cache.set('user:123:name', 'John');
     * cache.set('user:123:email', 'john@example.com');
     * cache.set('post:456', 'Hello World');
     *
     * const removed = cache.deleteByPrefix('user:123:'); // Returns 2
     * ```
     */
    deleteByPrefix(prefix: string): number {
        let count = 0
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key)
                count++
            }
        }
        return count
    }

    /**
     * Removes all entries from the cache whose keys match the given wildcard pattern.
     * Supports asterisk (*) wildcards for flexible pattern matching.
     *
     * @param {string} magicString - The wildcard pattern to match against cache keys (use * for wildcards)
     * @returns {number} Number of entries removed
     *
     * @example
     * ```typescript
     * const cache = new MemoryCache<string>();
     * cache.set('user:123:name', 'John');
     * cache.set('user:123:email', 'john@example.com');
     * cache.set('user:456:name', 'Jane');
     * cache.set('post:789', 'Hello World');
     *
     * const removed1 = cache.deleteByMagicString('user:123:*'); // Returns 2 (matches name and email)
     * const removed2 = cache.deleteByMagicString('user:*:name'); // Returns 1 (matches Jane's name)
     * const removed3 = cache.deleteByMagicString('post:*'); // Returns 1 (matches the post)
     * ```
     */
    deleteByMagicString(magicString: string): number {
        let count = 0

        // Convert wildcard pattern to regex
        const escapedPattern = magicString
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars except *
            .replace(/\*/g, '.*') // Convert * to .*

        const regex = new RegExp(`^${escapedPattern}$`)

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key)
                count++
            }
        }
        return count
    }
}

/**
 * Cache decorator factory for method-level caching.
 * Provides a way to cache method results based on their arguments.
 *
 * @template T - The return type of the decorated method
 * @param {CacheOptions} options - Configuration options for the cache
 * @returns A method decorator that caches the results
 *
 * @example
 * ```typescript
 * class UserService {
 *     @cached<User>({ ttl: 60000 })
 *     async getUser(id: string): Promise<User> {
 *         // Expensive operation
 *         return await fetchUser(id);
 *     }
 * }
 * ```
 */
export function cached<T>(options: CacheOptions = {}) {
    const cache = new MemoryCache<T>(options)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const originalMethod = descriptor.value

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptor.value = function (...args: any[]) {
            const key = `${propertyKey}:${JSON.stringify(args)}`

            // Use has() to check if key exists, then get() to retrieve value
            // This allows us to distinguish between cache miss and cached undefined
            if (cache.has(key)) {
                return cache.get(key)
            }

            const result = originalMethod.apply(this, args)
            cache.set(key, result)
            return result
        }

        return descriptor
    }
}
