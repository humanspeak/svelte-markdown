import { Unsupported } from '$lib/renderers/index.js'
import {
    defaultRenderers,
    type RendererComponent,
    type Renderers
} from '$lib/utils/markdown-parser.js'
import { rendererKeysInternal, type RendererKey } from '$lib/utils/rendererKeys.js'
import { createFilterUtilities } from './createFilterUtilities.js'

// Create filter utilities using the generic factory
const filterUtils = createFilterUtilities<RendererKey, Omit<Renderers, 'html'>>(
    rendererKeysInternal,
    Unsupported,
    defaultRenderers as Record<RendererKey, RendererComponent>
)

/**
 * Builds a map where every markdown renderer (excluding the special `html` map)
 * is set to the `Unsupported` component.
 *
 * @function buildUnsupportedRenderers
 * @returns {Omit<Renderers, 'html'>} A map with all non‑HTML renderers set to `Unsupported`.
 * @example
 * import { buildUnsupportedRenderers } from '@humanspeak/svelte-markdown'
 * const renderers = {
 *   ...buildUnsupportedRenderers(),
 *   html: {} // customize HTML separately
 * }
 */
export const buildUnsupportedRenderers = filterUtils.buildUnsupported

/**
 * Produces a renderer map that allows only the specified markdown renderers (excluding `html`).
 * All non‑listed renderer keys are set to `Unsupported`.
 * Each entry can be either a renderer key (to use the library's default component),
 * or a tuple `[key, component]` to specify a custom component for that key.
 *
 * @function allowRenderersOnly
 * @param {Array<RendererKey | [RendererKey, RendererComponent]>} allowed
 *        Renderer keys to allow, or tuples for custom component overrides.
 * @returns {Omit<Renderers, 'html'>} A renderer map with only the provided keys enabled.
 * @example
 * // Allow only paragraph and link with defaults
 * const renderers = allowRenderersOnly(['paragraph', 'link'])
 *
 * @example
 * // Allow paragraph with a custom component
 * const renderers = allowRenderersOnly([['paragraph', MyParagraph]])
 */
export const allowRenderersOnly = filterUtils.allowOnly as (
    _allowed: Array<RendererKey | [RendererKey, RendererComponent]>
) => Omit<Renderers, 'html'>

/**
 * Produces a renderer map that excludes only the specified markdown renderer keys (excluding `html`).
 * Excluded keys are mapped to `Unsupported`, while all other keys use the library's default components.
 * Optionally override specific non‑excluded keys with custom components via `[key, component]` tuples.
 *
 * Exclusions take precedence over overrides.
 *
 * @function excludeRenderersOnly
 * @param {Array<RendererKey>} excluded
 *        Renderer keys to exclude (set to `Unsupported`).
 * @param {Array<[RendererKey, RendererComponent]>} [overrides]
 *        Optional tuples mapping non‑excluded keys to custom components.
 * @returns {Omit<Renderers, 'html'>} A renderer map with only the provided keys excluded.
 * @example
 * // Disable just paragraph and link, keep others as defaults
 * const renderers = excludeRenderersOnly(['paragraph', 'link'])
 *
 * @example
 * // Disable link; override paragraph to a custom component
 * const renderers = excludeRenderersOnly(['link'], [['paragraph', MyParagraph]])
 */
export const excludeRenderersOnly = filterUtils.excludeOnly as (
    _excluded: RendererKey[],
    _overrides?: Array<[RendererKey, RendererComponent]>
) => Omit<Renderers, 'html'>
