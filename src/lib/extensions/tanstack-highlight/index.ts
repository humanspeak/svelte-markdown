/**
 * TanStack Highlight engine for the shared `HighlightedCode` renderer.
 *
 * Shipped ONLY via the `@humanspeak/svelte-markdown/extensions/tanstack-highlight`
 * subpath — intentionally NOT re-exported from the `extensions` barrel.
 * `createTanstackHighlighter.js` statically imports `@tanstack/highlight/core`
 * from plain JS, so a barrel re-export would force every barrel consumer's
 * bundler to resolve `@tanstack/highlight` (an optional peer dependency) even
 * when they never use highlighting (guarded by `barrel-optional-deps.test.ts`).
 *
 * The renderer, context key, and singleton live on the engine-free
 * `extensions/highlight` subpath and are re-exported here for convenience.
 *
 * @module
 */

export {
    HIGHLIGHT_CONTEXT_KEY,
    HighlightedCode,
    getCodeHighlighter,
    setCodeHighlighter,
    type CodeHighlighter
} from '../highlight/index.js'
export {
    TANSTACK_FALLBACK_CLASS,
    createTanstackHighlighter,
    type CreateTanstackHighlighterOptions
} from './createTanstackHighlighter.js'
