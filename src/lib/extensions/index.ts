/**
 * Extension helpers for `@humanspeak/svelte-markdown`.
 *
 * Import from `@humanspeak/svelte-markdown/extensions`:
 *
 * ```ts
 * import { markedMermaid, MermaidRenderer } from '@humanspeak/svelte-markdown/extensions'
 * import { markedAlert, AlertRenderer } from '@humanspeak/svelte-markdown/extensions'
 * import { markedFootnote, FootnoteRef, FootnoteSection } from '@humanspeak/svelte-markdown/extensions'
 * import { markedKatex, KatexRenderer } from '@humanspeak/svelte-markdown/extensions'
 * ```
 *
 * Shiki is deliberately NOT re-exported here — import it from the dedicated
 * `@humanspeak/svelte-markdown/extensions/shiki` subpath instead. Its
 * implementation statically imports `shiki/core` from plain JS, so exporting it
 * from this barrel forces every barrel consumer's bundler to resolve `shiki`
 * (an optional peer dependency) even when they never use highlighting.
 *
 * @module @humanspeak/svelte-markdown/extensions
 */

export { AlertRenderer, markedAlert } from './alert/index.js'
export type { AlertType } from './alert/index.js'
export { FootnoteRef, FootnoteSection, markedFootnote } from './footnote/index.js'
export { BLOCK_KATEX_TOKEN, INLINE_KATEX_TOKEN, KatexRenderer, markedKatex } from './katex/index.js'
export type { MarkedKatexOptions } from './katex/index.js'
export { MermaidRenderer, markedMermaid } from './mermaid/index.js'
