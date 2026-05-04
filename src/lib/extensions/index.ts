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
 * @module @humanspeak/svelte-markdown/extensions
 */

export { AlertRenderer, markedAlert } from './alert/index.js'
export type { AlertType } from './alert/index.js'
export { FootnoteRef, FootnoteSection, markedFootnote } from './footnote/index.js'
export { BLOCK_KATEX_TOKEN, INLINE_KATEX_TOKEN, KatexRenderer, markedKatex } from './katex/index.js'
export type { MarkedKatexOptions } from './katex/index.js'
export { MermaidRenderer, markedMermaid } from './mermaid/index.js'
