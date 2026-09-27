/**
 * Highlighter injection channels shared by every engine.
 *
 * The `code` renderer is instantiated deep inside `SvelteMarkdown` via the
 * `renderers` prop, which only forwards token-derived props (`lang`, `text`).
 * There is no ergonomic way to thread a per-instance `highlighter` prop
 * through the standard renderers map, so `HighlightedCode` resolves one in
 * priority order:
 *
 * 1. an explicit `highlighter` prop (only reachable if the consumer wraps
 *    `HighlightedCode` in their own component),
 * 2. Svelte {@link https://svelte.dev/docs/svelte#setcontext | context} set by
 *    an ancestor of `<SvelteMarkdown>` under {@link HIGHLIGHT_CONTEXT_KEY},
 * 3. a module-level singleton set via {@link setCodeHighlighter}.
 *
 * Both channels carry a {@link CodeHighlighter}, so a Shiki highlighter and a
 * TanStack highlighter are interchangeable at every injection point.
 *
 * @module
 */

import type { CodeHighlighter } from './codeHighlighter.js'

/**
 * Context key an ancestor of `<SvelteMarkdown>` can set to inject a highlighter.
 *
 * A global-registry symbol so the same key resolves across module boundaries
 * (the `shiki` subpath re-exports it as `SHIKI_CONTEXT_KEY`).
 */
export const HIGHLIGHT_CONTEXT_KEY: unique symbol = Symbol.for('svelte-markdown:code-highlighter')

let singleton: CodeHighlighter | undefined

/**
 * Register a process/module-wide highlighter used by every `HighlightedCode`
 * that receives neither a prop nor a context highlighter. Convenient for apps
 * with a single global theme; pass `undefined` to clear (used in tests).
 */
export const setCodeHighlighter = (highlighter: CodeHighlighter | undefined): void => {
    singleton = highlighter
}

/** Read the current module-level singleton highlighter, if any. */
export const getCodeHighlighter = (): CodeHighlighter | undefined => singleton
