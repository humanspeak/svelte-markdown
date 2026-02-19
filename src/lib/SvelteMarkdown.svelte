<!--
@component

 A Svelte component that renders Markdown content into HTML using a customizable parser.
 Supports both string input and pre-parsed markdown tokens, with configurable rendering
 options and custom renderers.

 @example
 ```svelte
 <SvelteMarkdown source="# Hello World" />

 <SvelteMarkdown
   source={markdownString}
   options={{ headerIds: false }}
   renderers={{ link: CustomLink }}
 />
 ```

 @property {string | Token[]} source - The markdown content to render, either as a string or pre-parsed tokens
 @property {Partial<Renderers>} [renderers] - Custom renderers for markdown elements
 @property {SvelteMarkdownOptions} [options] - Configuration options for the markdown parser
 @property {boolean} [isInline=false] - Whether to parse the content as inline markdown
 @property {function} [parsed] - Callback function called with the parsed tokens
-->
<script lang="ts">
    /**
     * Component Evolution & Design Notes:
     *
     * 1. Core Purpose:
     * - Serves as the main entry point for markdown rendering in Svelte
     * - Handles both string input and pre-parsed tokens for flexibility
     *
     * 2. Key Design Decisions:
     * - Uses a separate Parser component for actual rendering to maintain separation of concerns
     * - Implements token cleanup via shrinkHtmlTokens to optimize HTML token handling
     * - Maintains state synchronization using Svelte 5's $state and $effect
     *
     * 3. Performance Considerations:
     * - Token caching: Parsed tokens are cached to avoid re-parsing unchanged content
     * - Fast FNV-1a hashing for efficient cache key generation
     * - LRU eviction keeps memory usage bounded (default: 50 cached documents)
     * - Cache hit: <1ms (vs 50-200ms parsing)
     * - Uses key directive for proper component rerendering when source changes
     * - Intentionally avoids reactive tokens to prevent double processing
     *
     * 4. Extensibility:
     * - Supports custom renderers through composition pattern
     * - Allows parser configuration via options prop
     * - Provides parsed callback for external token access
     */

    import Parser from '$lib/Parser.svelte'
    import { type SvelteMarkdownProps } from '$lib/types.js'
    import {
        defaultOptions,
        defaultRenderers,
        Slugger,
        type Token,
        type TokensList
    } from '$lib/utils/markdown-parser.js'
    import { parseAndCacheTokens } from '$lib/utils/parse-and-cache.js'
    import { rendererKeysInternal } from '$lib/utils/rendererKeys.js'
    import { Marked } from 'marked'

    const {
        source = [],
        renderers = {},
        options = {},
        isInline = false,
        parsed = () => {},
        extensions = [],
        ...rest
    }: SvelteMarkdownProps & {
        [key: string]: unknown
    } = $props()

    // Extract custom token type names from the extensions array
    const extensionTokenNames = $derived(
        extensions.flatMap((ext) => ext.extensions?.map((e) => e.name) ?? [])
    )

    // Create a scoped Marked instance and extract its resolved defaults
    const extensionDefaults = $derived(
        extensions.length > 0 ? new Marked(...extensions).defaults : {}
    )

    const combinedOptions = $derived({ ...defaultOptions, ...extensionDefaults, ...options })
    const slugger = new Slugger()

    const tokens = $derived.by(() => {
        // Pre-parsed tokens - skip caching and parsing
        if (Array.isArray(source)) {
            return source as Token[]
        }

        // Empty string - return empty array (avoid cache overhead)
        if (source === '') {
            return []
        }

        // Parse with caching (handles cache lookup, parsing, and storage)
        return parseAndCacheTokens(source as string, combinedOptions, isInline)
    }) satisfies Token[] | TokensList | undefined

    $effect(() => {
        if (!tokens) return
        parsed(tokens)
    })

    const combinedRenderers = $derived({
        ...defaultRenderers,
        ...renderers,
        html: renderers.html
            ? {
                  ...defaultRenderers.html,
                  ...renderers.html
              }
            : defaultRenderers.html
    })

    // All renderer keys: built-in + extension token names
    const allRendererKeys = $derived([...rendererKeysInternal, ...extensionTokenNames])

    // Collect markdown snippet overrides (keys matching renderer names or extension token names)
    const snippetOverrides = $derived(
        Object.fromEntries(
            allRendererKeys
                .filter((key) => key in rest && rest[key] != null)
                .map((key) => [key, rest[key]])
        )
    )

    // Collect HTML snippet overrides (keys matching html_<tag>)
    const htmlSnippetOverrides = $derived(
        Object.fromEntries(
            Object.entries(rest)
                .filter(([key, val]) => key.startsWith('html_') && val != null)
                .map(([key, val]) => [key.slice(5), val])
        )
    )

    // Passthrough: everything that isn't a known snippet override
    const snippetKeySet = $derived(
        new Set([...allRendererKeys, ...Object.keys(rest).filter((k) => k.startsWith('html_'))])
    )
    const passThroughProps = $derived(
        Object.fromEntries(Object.entries(rest).filter(([key]) => !snippetKeySet.has(key)))
    )
</script>

<Parser
    {tokens}
    {...passThroughProps}
    options={combinedOptions}
    slug={(val: string): string => (slugger ? slugger.slug(val) : '')}
    renderers={combinedRenderers}
    {snippetOverrides}
    {htmlSnippetOverrides}
/>
