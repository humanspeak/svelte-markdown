<script lang="ts">
    import { setContext } from 'svelte'
    import { Lexer, defaultOptions, defaultRenderers, Slugger, type Token, type TokensList } from '$lib/utils/markdown-parser.js'
    import { key } from '$lib/utils/context.js'
    import Parser from './Parser.svelte'

    interface Props {
        source: Token[] | string
        renderers?: object
        options?: object
        isInline?: boolean
        parsed?: (tokens: Token[] | TokensList) => void
    }

    let { source = [], renderers = {}, options = {}, isInline = false, parsed = () => {} }: Props = $props()

    // svelte-ignore non_reactive_update
    let tokens: Token[] | TokensList | undefined = $state<Token[] | TokensList | undefined>(undefined)
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

    setContext(key, {
        slug: (val: string) => (slugger ? slugger.slug(val) : ''),
        getOptions: () => combinedOptions
    })
</script>

<Parser {tokens} renderers={combinedRenderers} />
