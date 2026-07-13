/**
 * Tail-window safety markers for extension tokenizers.
 *
 * The streaming `IncrementalParser` normally disables its tail-window (which
 * re-lexes only the appended tail and reuses a stable token prefix) the moment
 * any extension tokenizer is registered, because a tokenizer whose output
 * depends on prefix content would produce wrong tokens when the prefix is not
 * re-lexed. Tokenizers carrying the marker defined here promise to be
 * **block-anchored and stateless** — they inspect only `src` from the current
 * position, exactly like Marked's built-in block rules — so re-lexing the tail
 * from a stable block boundary is guaranteed to match a full re-lex.
 *
 * Marked's `use()` stores the tokenizer **function reference** in
 * `options.extensions.block` / `options.extensions.inline`, so the marker must
 * live on the function itself (which survives by reference); it is invisible
 * to `Marked` otherwise. This is a global-registry symbol so the promise is
 * checkable across module boundaries without importing the same binding.
 *
 * @remarks This is a promise about tokenizer statelessness. Any extension with
 * cross-block state (e.g. footnotes, whose definitions and references interact
 * across blocks) must **not** carry it.
 *
 * @module tail-window
 */

import type { MarkedExtension } from 'marked'

/** Marker key carried by tail-window-safe tokenizer functions. */
export const TAIL_WINDOW_SAFE: unique symbol = Symbol.for('svelte-markdown.tailWindowSafe')

/**
 * Tags a single extension tokenizer function as tail-window safe (see the
 * module doc). Only apply to block-anchored, stateless tokenizers; prefer
 * {@link tailWindowSafeExtension} to mark a whole extension atomically.
 *
 * @param tokenizer - The tokenizer function to mark
 */
export const markTailWindowSafe = (tokenizer: (..._args: never[]) => unknown): void => {
    ;(tokenizer as unknown as Record<symbol, boolean>)[TAIL_WINDOW_SAFE] = true
}

/**
 * Marks every tokenizer in a Marked extension as tail-window safe and returns
 * the extension. This is the whole-extension form of the promise: all of the
 * extension's tokenizers are block-anchored and stateless, so none of them can
 * be half-applied or forgotten when a tokenizer is added later.
 *
 * @param ext - The Marked extension whose tokenizers are all tail-window safe
 * @returns The same extension, with every tokenizer marked
 */
export const tailWindowSafeExtension = (ext: MarkedExtension): MarkedExtension => {
    for (const entry of ext.extensions ?? []) {
        if ('tokenizer' in entry && typeof entry.tokenizer === 'function') {
            markTailWindowSafe(entry.tokenizer)
        }
    }
    return ext
}

/**
 * True when `value` is a tail-window-safe tokenizer function carrying the
 * {@link TAIL_WINDOW_SAFE} marker.
 *
 * @param value - Candidate entry from `options.extensions.block`/`.inline`
 * @returns `true` if the entry is a function marked tail-window safe
 */
export const isTailWindowSafe = (value: unknown): boolean =>
    typeof value === 'function' &&
    (value as unknown as Record<symbol, unknown>)[TAIL_WINDOW_SAFE] === true
