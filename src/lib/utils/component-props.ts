import { defaultRenderers } from '$lib/utils/markdown-parser.js'
import { rendererKeysInternal } from '$lib/utils/rendererKeys.js'
import type { Snippet } from 'svelte'

export type AnySnippet = Snippet<[Record<string, unknown>]>

type RestProps = Record<string, unknown>

/**
 * Merges caller HTML tag renderers over the built-in map.
 *
 * Keys are canonicalized to lowercase to match the tag names emitted by the
 * parser, so one tag has exactly one entry. Without this, `{ IFRAME: null }`
 * would sit alongside the lowercase `iframe` default and the tag would render
 * anyway, silently ignoring an explicit block.
 *
 * @param overrides Caller-supplied HTML renderers, in any casing.
 * @returns Defaults with caller entries taking precedence, keyed by lowercase tag.
 */
const mergeHtmlRenderers = (overrides: NonNullable<typeof defaultRenderers.html>) => ({
    ...defaultRenderers.html,
    ...(Object.fromEntries(
        Object.entries(overrides).map(([key, value]) => [key.toLowerCase(), value])
    ) as typeof defaultRenderers.html)
})

/**
 * Merges caller renderer overrides with the built-in renderer map.
 *
 * @param renderers Partial renderer overrides from component props.
 * @returns Renderer map with default markdown and HTML renderers preserved.
 */
export const buildCombinedRenderers = (renderers: Partial<typeof defaultRenderers>) => ({
    ...defaultRenderers,
    ...renderers,
    html: renderers.html ? mergeHtmlRenderers(renderers.html) : defaultRenderers.html
})

/**
 * Gets renderer keys recognized by the component.
 *
 * @param extensionTokenNames Custom token names declared by Marked extensions.
 * @returns Built-in markdown renderer keys followed by extension token names.
 */
export const getAllRendererKeys = (extensionTokenNames: string[]) => [
    ...rendererKeysInternal,
    ...extensionTokenNames
]

/**
 * Extracts markdown snippet overrides from rest props.
 *
 * @param rest Extra component props after known SvelteMarkdown props are removed.
 * @param allRendererKeys Built-in and extension renderer keys to match.
 * @returns Snippet overrides keyed by markdown token type.
 */
export const getSnippetOverrides = (rest: RestProps, allRendererKeys: string[]) =>
    Object.fromEntries(
        allRendererKeys
            .filter((key) => key in rest && rest[key] != null)
            .map((key) => [key, rest[key]])
    ) as Record<string, AnySnippet>

/**
 * Extracts HTML snippet overrides from rest props.
 *
 * @param rest Extra component props after known SvelteMarkdown props are removed.
 * @returns HTML snippet overrides keyed by tag name without the `html_` prefix.
 */
export const getHtmlSnippetOverrides = (rest: RestProps) =>
    Object.fromEntries(
        Object.entries(rest)
            .filter(([key, val]) => key.startsWith('html_') && val != null)
            // Lowercase to match canonical tag names emitted by the parser,
            // so `html_DIV` and `html_div` both match a `<div>` token.
            .map(([key, val]) => [key.slice(5).toLowerCase(), val])
    ) as Record<string, AnySnippet>

/**
 * Removes snippet override props from the props forwarded to Parser.
 *
 * @param rest Extra component props after known SvelteMarkdown props are removed.
 * @param allRendererKeys Built-in and extension renderer keys to exclude.
 * @returns Props that should pass through to the rendered markdown tree.
 */
export const getPassThroughProps = (rest: RestProps, allRendererKeys: string[]) => {
    const snippetKeySet = new Set([
        ...allRendererKeys,
        ...Object.keys(rest).filter((key) => key.startsWith('html_'))
    ])

    return Object.fromEntries(Object.entries(rest).filter(([key]) => !snippetKeySet.has(key)))
}
