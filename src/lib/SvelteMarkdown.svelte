<script lang="ts">
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

    interface Props {
        source: Token[] | string
        renderers?: object
        options?: SvelteMarkdownOptions
        isInline?: boolean
        parsed?: (tokens: Token[] | TokensList) => void
    }

    let {
        source = [],
        renderers = {},
        options = {} as SvelteMarkdownOptions,
        isInline = false,
        parsed = () => {},
        ...rest
    }: Props & { [key: string]: any } = $props()
    let tokens: Token[] | TokensList | undefined = $state<Token[] | TokensList | undefined>(
        undefined
    )
    let lexer: Lexer | undefined = undefined

    let slugger = source ? new Slugger() : undefined
    let combinedOptions = { ...defaultOptions, ...options }

    $effect.pre(() => {
        if (Array.isArray(source)) {
            tokens = source as Token[]
        } else {
            lexer = new Lexer(combinedOptions)
            tokens = isInline ? lexer.inlineTokens(source as string) : lexer.lex(source as string)
        }
    })
    $effect(() => {
        if (tokens) parsed($state.snapshot(tokens))
    })

    let combinedRenderers = {
        ...defaultRenderers,
        ...renderers
    }
</script>

<Parser
    {tokens}
    {...rest}
    options={combinedOptions}
    slug={(val: string): string => (slugger ? slugger.slug(val) : '')}
    renderers={combinedRenderers}
/>
