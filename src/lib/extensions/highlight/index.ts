/**
 * Engine-agnostic syntax-highlighting renderer.
 *
 * Import from `@humanspeak/svelte-markdown/extensions/highlight`. This subpath
 * has **no engine dependency** — pair it with a factory from
 * `extensions/shiki` or `extensions/tanstack-highlight` (or implement
 * {@link CodeHighlighter} yourself):
 *
 * ```ts
 * import { HighlightedCode, setCodeHighlighter } from '@humanspeak/svelte-markdown/extensions/highlight'
 * import { createTanstackHighlighter } from '@humanspeak/svelte-markdown/extensions/tanstack-highlight'
 * ```
 *
 * @module
 */

export {
    FALLBACK_CLASS,
    escapeHtml,
    renderFallback,
    type CodeHighlighter
} from './codeHighlighter.js'
export {
    HIGHLIGHT_CONTEXT_KEY,
    getCodeHighlighter,
    setCodeHighlighter
} from './highlightContext.js'
export { default as HighlightedCode } from './HighlightedCode.svelte'
