/**
 * Backward-compatible names for the shared highlighter injection channels.
 *
 * The context key and singleton now live on the engine-agnostic
 * `extensions/highlight` subpath so a Shiki highlighter and a TanStack
 * highlighter are interchangeable at every injection point. These aliases
 * keep every pre-existing `extensions/shiki` import working unchanged:
 * `SHIKI_CONTEXT_KEY` **is** `HIGHLIGHT_CONTEXT_KEY` (same symbol), and
 * `setShikiHighlighter` / `getShikiHighlighter` read and write the same
 * singleton as `setCodeHighlighter` / `getCodeHighlighter`.
 *
 * @module
 */

import {
    getCodeHighlighter,
    HIGHLIGHT_CONTEXT_KEY,
    setCodeHighlighter
} from '../highlight/highlightContext.js'

/**
 * Context key an ancestor of `<SvelteMarkdown>` can set to inject a highlighter.
 * Alias of `HIGHLIGHT_CONTEXT_KEY`.
 */
export const SHIKI_CONTEXT_KEY = HIGHLIGHT_CONTEXT_KEY

/**
 * Register a module-wide highlighter. Alias of `setCodeHighlighter`; pass
 * `undefined` to clear (used in tests).
 */
export const setShikiHighlighter = setCodeHighlighter

/** Read the current module-level singleton highlighter. Alias of `getCodeHighlighter`. */
export const getShikiHighlighter = getCodeHighlighter
