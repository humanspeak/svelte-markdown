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
     * - Caches previous source to prevent unnecessary re-parsing
     * - Uses key directive for proper component rerendering when source changes
     * - Intentionally avoids reactive tokens to prevent double processing
     *
     * 4. Extensibility:
     * - Supports custom renderers through composition pattern
     * - Allows parser configuration via options prop
     * - Provides parsed callback for external token access
     */

    import {
        Lexer,
        defaultOptions,
        defaultRenderers,
        Slugger,
        type Token,
        type TokensList,
        type SvelteMarkdownOptions
    } from './utils/markdown-parser.js'
    import Parser from './Parser.svelte'
    import { shrinkHtmlTokens } from './utils/token-cleanup.js'
    import { type SvelteMarkdownProps } from './types.js'

    const {
        source = [],
        renderers = {},
        options = {} as SvelteMarkdownOptions,
        isInline = false,
        parsed = () => {},
        ...rest
    }: SvelteMarkdownProps & {
        [key: string]: unknown
    } = $props()

    const combinedOptions = { ...defaultOptions, ...options }
    const slugger = source ? new Slugger() : undefined
    let lexer: Lexer

    let tokens = $derived.by(() => {
        if (!lexer) {
            lexer = new Lexer(combinedOptions)
        }
        if (Array.isArray(source)) {
            return source as Token[]
        }
        return source
            ? (shrinkHtmlTokens(
                  isInline ? lexer.inlineTokens(source as string) : lexer.lex(source as string)
              ) as Token[])
            : []
    }) satisfies Token[] | TokensList | undefined

    $effect(() => {
        if (!tokens) return
        parsed(tokens)
    })

    const combinedRenderers = {
        ...defaultRenderers,
        ...renderers,
        html: {
            ...defaultRenderers.html,
            ...renderers.html
        }
    }
</script>

<Parser
    {tokens}
    {...rest}
    options={combinedOptions}
    slug={(val: string): string => (slugger ? slugger.slug(val) : '')}
    renderers={combinedRenderers}
/>
