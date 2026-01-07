import Html from '$lib/renderers/html/index.js'
import { defaultRenderers, type Renderers } from '$lib/utils/markdown-parser.js'

export type RendererKey = Exclude<keyof Renderers, 'html'>
export const rendererKeysInternal = Object.keys(defaultRenderers).filter(
    (k) => k !== 'html'
) as RendererKey[]

export type HtmlKey = keyof typeof Html & string
export const htmlRendererKeysInternal = Object.keys(Html) as HtmlKey[]
