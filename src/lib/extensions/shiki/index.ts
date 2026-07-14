/**
 * Streaming-compatible Shiki syntax-highlighting extension.
 *
 * Shipped ONLY via the `@humanspeak/svelte-markdown/extensions/shiki` subpath —
 * intentionally NOT re-exported from the `extensions` barrel.
 * `createShikiHighlighter.js` statically imports `shiki/core` from plain JS, so
 * a barrel re-export would force every barrel consumer's bundler to resolve
 * `shiki` (an optional peer dependency) even when they never use highlighting
 * (guarded by `barrel-optional-deps.test.ts`).
 *
 * @module
 */

export {
    createShikiHighlighter,
    escapeHtml,
    type CreateShikiHighlighterOptions,
    type ShikiHighlighter
} from './createShikiHighlighter.js'
export { default as ShikiCode } from './ShikiCode.svelte'
export { SHIKI_CONTEXT_KEY, getShikiHighlighter, setShikiHighlighter } from './shikiContext.js'
