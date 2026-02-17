/**
 * Canonical key lists for markdown renderers and HTML tag renderers.
 *
 * These arrays and types drive the allow/deny filter utilities and serve as
 * the single source of truth for which renderer and HTML tag names the
 * library recognizes.
 *
 * @module
 */

import Html from '$lib/renderers/html/index.js'
import { defaultRenderers, type Renderers } from '$lib/utils/markdown-parser.js'

/**
 * Union type of every valid markdown renderer key (excludes `'html'`).
 *
 * Derived from the {@link Renderers} interface at the type level.
 */
export type RendererKey = Exclude<keyof Renderers, 'html'>

/**
 * Canonical array of every markdown renderer key.
 *
 * Re-exported publicly as `rendererKeys`. Built at runtime from
 * `defaultRenderers` (filtering out the special `html` key).
 */
export const rendererKeysInternal = Object.keys(defaultRenderers).filter(
    (k) => k !== 'html'
) as RendererKey[]

/**
 * Union type of every supported HTML tag name that has a dedicated renderer.
 */
export type HtmlKey = keyof typeof Html & string

/**
 * Canonical array of every HTML tag name with a built-in renderer.
 *
 * Re-exported publicly as `htmlRendererKeys`.
 */
export const htmlRendererKeysInternal = Object.keys(Html) as HtmlKey[]
