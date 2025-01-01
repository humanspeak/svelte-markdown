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
    let tokens: Token[] | TokensList | undefined = $state<Token[] | TokensList | undefined>(
        undefined
    )
    let lexer: Lexer | undefined = undefined
    let previousTokens: Token[] | TokensList | undefined = undefined

    const slugger = source ? new Slugger() : undefined
    const combinedOptions = { ...defaultOptions, ...options }

    $effect.pre(() => {
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
        if (tokens && tokens !== previousTokens) {
            previousTokens = tokens
            parsed($state.snapshot(tokens))
        }
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
