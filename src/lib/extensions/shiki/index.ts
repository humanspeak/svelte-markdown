/**
 * SPIKE — streaming-compatible Shiki syntax-highlighting extension.
 *
 * Intentionally NOT wired into the `extensions` barrel or the `package.json`
 * `exports` map: shipping is a follow-up decision (see the design report at
 * `.agents/.plans/bigger-faster-stronger/004-shiki-spike-report.md`).
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
