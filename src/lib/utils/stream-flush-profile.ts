/**
 * Opt-in User Timing instrumentation for the streaming flush.
 *
 * When enabled, every flush of buffered stream input (parse + token diff +
 * reactive state assignment) is recorded as a `performance.measure` entry
 * named {@link STREAM_FLUSH_MEASURE}. The entry does NOT include Svelte's
 * DOM commit for that state change, which runs in a later microtask —
 * benchmarks that need end-to-end frame cost must measure that externally
 * (see `src/routes/test/stream-compare`).
 *
 * Instrumentation is off by default because `performance.measure` entries
 * accumulate in the timeline buffer for the page's lifetime; a long chat
 * session would otherwise leak one entry per flush. Enable it by setting
 * `globalThis.__svelteMarkdownProfile = true` before streaming starts.
 *
 * @module stream-flush-profile
 */

/** Name of the `performance.measure` entry emitted per stream flush. */
export const STREAM_FLUSH_MEASURE = 'svelte-markdown:stream-flush'

/** Global opt-in flag read on every flush (a single property lookup). */
export const STREAM_FLUSH_PROFILE_FLAG = '__svelteMarkdownProfile'

type ProfileGlobal = typeof globalThis & { [STREAM_FLUSH_PROFILE_FLAG]?: boolean }

/**
 * Whether stream-flush profiling is currently enabled and supported.
 *
 * @returns `true` when the opt-in flag is set and `performance.measure` exists
 * @example
 * ```ts
 * globalThis.__svelteMarkdownProfile = true
 * isStreamFlushProfilingEnabled() // true (in a browser)
 * ```
 */
export const isStreamFlushProfilingEnabled = (): boolean =>
    (globalThis as ProfileGlobal)[STREAM_FLUSH_PROFILE_FLAG] === true &&
    typeof performance !== 'undefined' &&
    typeof performance.now === 'function' &&
    typeof performance.measure === 'function'

/**
 * Runs `flush` and, when profiling is enabled, records its wall-clock duration
 * as a User Timing measure. Emits nothing when profiling is off.
 *
 * @param flush - The synchronous flush body to time
 * @param detail - Optional detail object attached to the measure entry
 * @returns Nothing; the measure (if any) is visible via `performance.getEntriesByName`
 * @example
 * ```ts
 * profileStreamFlush(() => applyStreamingSource(buffer), { sourceLength: buffer.length })
 * ```
 */
export const profileStreamFlush = (flush: () => void, detail?: Record<string, unknown>): void => {
    if (!isStreamFlushProfilingEnabled()) {
        flush()
        return
    }

    const start = performance.now()
    try {
        flush()
    } finally {
        performance.measure(STREAM_FLUSH_MEASURE, { start, end: performance.now(), detail })
    }
}
