// Reexport your entry components here
import { type HtmlRenderers } from '$lib/renderers/html/index.js'
import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
import type { SvelteMarkdownOptions, SvelteMarkdownProps } from '$lib/types.js'
import {
    defaultRenderers,
    type RendererComponent,
    type Renderers,
    type Token,
    type TokensList
} from '$lib/utils/markdown-parser.js'

export default SvelteMarkdown
export { default as Html, UnsupportedHTML } from '$lib/renderers/html/index.js'
export { Unsupported } from '$lib/renderers/index.js'
export {
    allowHtmlOnly,
    buildUnsupportedHTML,
    excludeHtmlOnly
} from '$lib/utils/unsupportedHtmlRenderers.js'
export {
    allowRenderersOnly,
    buildUnsupportedRenderers,
    excludeRenderersOnly
} from '$lib/utils/unsupportedRenderers.js'
export { defaultRenderers }
// Canonical key lists (public API names)
export {
    htmlRendererKeysInternal as htmlRendererKeys,
    rendererKeysInternal as rendererKeys
} from '$lib/utils/rendererKeys.js'
export type {
    HtmlRenderers,
    RendererComponent,
    Renderers,
    SvelteMarkdownOptions,
    SvelteMarkdownProps,
    Token,
    TokensList
}
