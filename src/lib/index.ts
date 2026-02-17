/**
 * Public API for `@humanspeak/svelte-markdown`.
 *
 * This module re-exports every symbol that consumers of the package can
 * import.  Exports are organized into the following groups:
 *
 * - **Default export** — the main `SvelteMarkdown` component
 * - **Component helpers** — `Html`, `Unsupported`, and `UnsupportedHTML`
 * - **Filter utilities** — allow/deny helpers for HTML tags and renderers
 * - **Constants** — `defaultRenderers`, `rendererKeys`, `htmlRendererKeys`
 * - **Cache utilities** — `MemoryCache`, `TokenCache`, `tokenCache`
 * - **Types** — `HtmlRenderers`, `Renderers`, `RendererComponent`,
 *   `SvelteMarkdownProps`, `SvelteMarkdownOptions`, `Token`, `TokensList`
 *
 * @see {@link https://markdown.svelte.page} — documentation site
 * @module @humanspeak/svelte-markdown
 */

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

/** The primary markdown rendering component. */
export default SvelteMarkdown

/** Default HTML tag-to-component map and the unsupported-tag placeholder. */
export { default as Html, UnsupportedHTML } from '$lib/renderers/html/index.js'

/** Placeholder component rendered for blocked markdown token types. */
export { Unsupported } from '$lib/renderers/index.js'

/**
 * Filter utilities for restricting which HTML tags are rendered.
 *
 * - `allowHtmlOnly`   — allow *only* the listed tags
 * - `excludeHtmlOnly` — block specific tags, allow the rest
 * - `buildUnsupportedHTML` — block every HTML tag
 */
export {
    allowHtmlOnly,
    buildUnsupportedHTML,
    excludeHtmlOnly
} from '$lib/utils/unsupportedHtmlRenderers.js'

/**
 * Filter utilities for restricting which markdown renderers are active.
 *
 * - `allowRenderersOnly`      — allow *only* the listed renderers
 * - `excludeRenderersOnly`    — block specific renderers, allow the rest
 * - `buildUnsupportedRenderers` — block every markdown renderer
 */
export {
    allowRenderersOnly,
    buildUnsupportedRenderers,
    excludeRenderersOnly
} from '$lib/utils/unsupportedRenderers.js'

/** Built-in renderer map used when no custom `renderers` prop is provided. */
export { defaultRenderers }

/**
 * Canonical key lists enumerating every valid renderer/HTML tag name.
 *
 * - `rendererKeys`     — markdown renderer keys (excludes `html`)
 * - `htmlRendererKeys`  — supported HTML tag names
 */
export {
    htmlRendererKeysInternal as htmlRendererKeys,
    rendererKeysInternal as rendererKeys
} from '$lib/utils/rendererKeys.js'

/**
 * Cache utilities for parsed markdown tokens.
 *
 * - `MemoryCache` — generic LRU cache
 * - `TokenCache`  — LRU cache specialized for parsed token arrays
 * - `tokenCache`  — shared singleton `TokenCache` instance
 */
export { MemoryCache } from '$lib/utils/cache.js'
export { TokenCache, tokenCache } from '$lib/utils/token-cache.js'

/** Re-exported types for consumer convenience. */
export type {
    HtmlRenderers,
    RendererComponent,
    Renderers,
    SvelteMarkdownOptions,
    SvelteMarkdownProps,
    Token,
    TokensList
}
