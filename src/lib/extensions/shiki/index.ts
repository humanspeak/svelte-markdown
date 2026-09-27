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
 * The renderer is the engine-agnostic `HighlightedCode` from
 * `extensions/highlight`, re-exported here as `ShikiCode` so existing imports
 * keep working. Prefer the `extensions/highlight` names in new code.
 *
 * @module
 */

export {
    HIGHLIGHT_CONTEXT_KEY,
    HighlightedCode,
    HighlightedCode as ShikiCode,
    getCodeHighlighter,
    setCodeHighlighter,
    type CodeHighlighter
} from '../highlight/index.js'
export {
    SHIKI_FALLBACK_CLASS,
    createShikiHighlighter,
    escapeHtml,
    type CreateShikiHighlighterOptions,
    type ShikiHighlighter
} from './createShikiHighlighter.js'
export { SHIKI_CONTEXT_KEY, getShikiHighlighter, setShikiHighlighter } from './shikiContext.js'
