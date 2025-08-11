// Reexport your entry components here
import Html, { type HtmlRenderers } from '$lib/renderers/html/index.js'
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
export { defaultRenderers }
export const rendererKeys = Object.keys(defaultRenderers).filter((k) => k !== 'html') as Exclude<
    keyof Renderers,
    'html'
>[]
export const htmlRendererKeys = Object.keys(Html) as (keyof HtmlRenderers)[]
export type {
    HtmlRenderers,
    RendererComponent,
    Renderers,
    SvelteMarkdownOptions,
    SvelteMarkdownProps,
    Token,
    TokensList
}
