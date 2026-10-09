import type { SvelteMarkdownProps } from '$lib/types.js'
import { getContext, setContext } from 'svelte'

/** Context key used to hand markdown rendering config down to preprocessed `.md` pages. */
export const MARKDOWN_DOCUMENT_CONTEXT = Symbol.for('svelte-markdown-document')

/**
 * Configuration a layout can supply to every preprocessed markdown document
 * beneath it. Mirrors the props of `<SvelteMarkdown>` that make sense to set
 * once for a whole route subtree.
 */
export type MarkdownDocumentConfig = Pick<
    SvelteMarkdownProps,
    'renderers' | 'options' | 'extensions' | 'sanitizeUrl' | 'sanitizeAttributes'
>

/**
 * Call from a `+layout.svelte` to give every `.md` page below it a shared set of
 * renderers/options — the preprocessor equivalent of passing props by hand.
 */
export function setMarkdownDocumentContext(config: MarkdownDocumentConfig): void {
    setContext(MARKDOWN_DOCUMENT_CONTEXT, config)
}

/** Read the nearest layout-provided markdown config, if any. */
export function getMarkdownDocumentContext(): MarkdownDocumentConfig {
    return getContext<MarkdownDocumentConfig | undefined>(MARKDOWN_DOCUMENT_CONTEXT) ?? {}
}
