import Html, { UnsupportedHTML, type HtmlRenderers } from '$lib/renderers/html/index.js'
import { htmlRendererKeysInternal, type HtmlKey } from '$lib/utils/rendererKeys.js'
import type { Component } from 'svelte'

/**
 * Builds a map of HTML renderers where every known HTML tag is mapped to `UnsupportedHTML`.
 * This is useful when you want to disable all built‑in HTML rendering and provide
 * explicit allow-lists or a minimal subset afterwards.
 *
 * @function buildUnsupportedHTML
 * @returns {HtmlRenderers} A map containing all tags set to `UnsupportedHTML`.
 * @example
 * import { buildUnsupportedHTML } from '@humanspeak/svelte-markdown'
 * const renderers = {
 *   html: buildUnsupportedHTML()
 * }
 */
export const buildUnsupportedHTML = (): HtmlRenderers => {
    const result: Partial<HtmlRenderers> = {}
    for (const key of htmlRendererKeysInternal) {
        result[key] = UnsupportedHTML
    }
    return result as HtmlRenderers
}

/**
 * Produces an HTML renderer map that allows only the specified tags.
 * All non‑listed tags are set to `UnsupportedHTML`.
 *
 * Each entry can be either a tag name (to use the library’s default component for that tag),
 * or a tuple `[tag, component]` to specify a custom component for that tag.
 *
 * @function allowHtmlOnly
 * @param {Array<keyof HtmlRenderers | [keyof HtmlRenderers, Component | null]>} allowed
 *        Tag names to allow, or tuples specifying a custom component per allowed tag.
 *        Any tag not listed will be mapped to `UnsupportedHTML`.
 * @returns {HtmlRenderers} A renderer map with only the provided tags enabled.
 * @example
 * // Only allow strong/em/a with default components; everything else UnsupportedHTML
 * const html = allowHtmlOnly(['strong', 'em', 'a'])
 *
 * @example
 * // Allow a custom component for div while allowing the default for a
 * const html = allowHtmlOnly([['div', MyDiv], 'a'])
 */
export const allowHtmlOnly = (
    allowed: Array<HtmlKey | [HtmlKey, Component | null]>
): HtmlRenderers => {
    const result = buildUnsupportedHTML()

    for (const entry of allowed) {
        if (Array.isArray(entry)) {
            const [tag, component] = entry
            // Only set if the tag exists in our Html map
            if (tag in Html) result[tag] = component
        } else {
            const tag = entry
            if (tag in Html) result[tag] = Html[tag]
        }
    }

    return result as HtmlRenderers
}

/**
 * Produces an HTML renderer map that excludes only the specified tags.
 * Excluded tags are mapped to `UnsupportedHTML`, while all other tags use the
 * library’s default components. Optionally, you can override specific non‑excluded
 * tags with custom components using `[tag, component]` tuples.
 *
 * Exclusions take precedence over overrides. If a tag is listed in `excluded`, an
 * override for the same tag will be ignored.
 *
 * @function excludeHtmlOnly
 * @param {Array<keyof HtmlRenderers>} excluded
 *        Tag names to exclude (set to `UnsupportedHTML`).
 * @param {Array<[keyof HtmlRenderers, Component | null]>} [overrides]
 *        Optional tuples mapping non‑excluded tags to custom components.
 * @returns {HtmlRenderers} A renderer map with only the provided tags excluded.
 * @example
 * // Disable just span and div, keep others as defaults
 * const html = excludeHtmlOnly(['span', 'div'])
 *
 * @example
 * // Disable span; override 'a' to CustomA component
 * const html = excludeHtmlOnly(['span'], [['a', CustomA]])
 */
export const excludeHtmlOnly = (
    excluded: HtmlKey[],
    overrides?: Array<[HtmlKey, Component | null]>
): HtmlRenderers => {
    const result: Partial<HtmlRenderers> = { ...Html }

    for (const tag of excluded) {
        if (tag in Html) result[tag] = UnsupportedHTML
    }

    if (overrides) {
        for (const [tag, component] of overrides) {
            // Exclusions take precedence; do not override excluded tags
            if (excluded.includes(tag)) continue
            if (tag in Html) result[tag] = component
        }
    }

    return result as HtmlRenderers
}
