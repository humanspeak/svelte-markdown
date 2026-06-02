import { defaultRenderers } from '$lib/utils/markdown-parser.js'
import { rendererKeysInternal } from '$lib/utils/rendererKeys.js'

type AnySnippet = (..._args: unknown[]) => unknown

type RestProps = Record<string, unknown>

/**
 * Merges caller renderer overrides with the built-in renderer map.
 *
 * @param renderers Partial renderer overrides from component props.
 * @returns Renderer map with default markdown and HTML renderers preserved.
 */
export const buildCombinedRenderers = (renderers: Partial<typeof defaultRenderers>) => ({
    ...defaultRenderers,
    ...renderers,
    html: renderers.html
        ? {
              ...defaultRenderers.html,
              ...renderers.html
          }
        : defaultRenderers.html
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
            .map(([key, val]) => [key.slice(5), val])
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
