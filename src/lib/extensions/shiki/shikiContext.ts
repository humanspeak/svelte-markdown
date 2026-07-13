/**
 * SPIKE — highlighter injection strategies for `ShikiCode.svelte`.
 *
 * The `code` renderer is instantiated deep inside `SvelteMarkdown` via the
 * `renderers` prop, which only forwards token-derived props (`lang`, `text`).
 * There is therefore no ergonomic way to thread a per-instance `highlighter`
 * prop through the standard renderers map, so the spike offers two out-of-band
 * channels and lets `ShikiCode` resolve in priority order:
 *
 * 1. an explicit `highlighter` prop (only reachable if the consumer wraps
 *    `ShikiCode` in their own component),
 * 2. Svelte {@link https://svelte.dev/docs/svelte#setcontext | context} set by
 *    an ancestor of `<SvelteMarkdown>` under {@link SHIKI_CONTEXT_KEY},
 * 3. a module-level singleton set via {@link setShikiHighlighter}.
 *
 * The report recommends one of these for the ship plan.
 *
 * @module
 */

import type { ShikiHighlighter } from './createShikiHighlighter.js'

/** Context key an ancestor of `<SvelteMarkdown>` can set to inject a highlighter. */
export const SHIKI_CONTEXT_KEY = Symbol('svelte-markdown:shiki-highlighter')

let singleton: ShikiHighlighter | undefined

/**
 * Register a process/module-wide highlighter used by every `ShikiCode` that
 * receives neither a prop nor a context highlighter. Convenient for apps with a
 * single global theme; pass `undefined` to clear (used in tests).
 */
export const setShikiHighlighter = (highlighter: ShikiHighlighter | undefined): void => {
    singleton = highlighter
}

/** Read the current module-level singleton highlighter, if any. */
export const getShikiHighlighter = (): ShikiHighlighter | undefined => singleton
