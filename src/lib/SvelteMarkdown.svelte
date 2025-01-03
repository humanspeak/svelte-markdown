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
    import {
        Lexer,
        defaultOptions,
        defaultRenderers,
        Slugger,
        type Token,
        type TokensList,
        type SvelteMarkdownOptions,
        type Renderers
    } from './utils/markdown-parser.js'
    import Parser from './Parser.svelte'
    import { shrinkHtmlTokens } from './utils/token-cleanup.js'

    interface Props {
        source: Token[] | string
        renderers?: Partial<Renderers>
        options?: SvelteMarkdownOptions
        isInline?: boolean
        parsed?: (tokens: Token[] | TokensList) => void // eslint-disable-line no-unused-vars
    }

    const {
        source = [],
        renderers = {},
        options = {} as SvelteMarkdownOptions,
        isInline = false,
        parsed = () => {},
        ...rest
    }: Props & {
        [key: string]: unknown
    } = $props()
    // @ts-expect-error - Intentionally not using $state for tokens
    let tokens: Token[] | undefined // eslint-disable-line svelte/valid-compile
    let previousSource = $state<string | Token[] | undefined>(undefined)
    let lexer: Lexer

    const slugger = source ? new Slugger() : undefined
    const combinedOptions = { ...defaultOptions, ...options }

    $effect.pre(() => {
        if (source === previousSource) return
        previousSource = source

        if (Array.isArray(source)) {
            tokens = shrinkHtmlTokens(source) as Token[]
        } else {
            lexer = new Lexer(combinedOptions)
            tokens = shrinkHtmlTokens(
                isInline ? lexer.inlineTokens(source as string) : lexer.lex(source as string)
            )
        }
    })

    $effect(() => {
        if (!tokens) return
        parsed($state.snapshot(tokens))
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
