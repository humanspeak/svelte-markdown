<script lang="ts">
    import { setContext } from 'svelte'
    import Parser from './Parser.svelte'
    import GithubSlugger from 'github-slugger'
    import { Lexer, defaultOptions, defaultRenderers } from './markdown-parser'
    import { key } from './context'
    import { Token, TokensList } from 'marked'

    /**
     * @typedef {Object} Props
     * @property {Token[] | string} [source]
     * @property {object} [renderers]
     * @property {object} [options]
     * @property {boolean} [isInline]
     */

    /** @type {Props} */
    let {
        source = [],
        renderers = {},
        options = {},
        isInline = false,
        parsed = () => {}
    }: {
        source: Token[] | string
        renderers: object
        options: object
        isInline: boolean
        parsed: (tokens: Token[]) => void
    } = $props()

    let tokens: Token[] | TokensList | undefined = undefined
    let lexer: Lexer | undefined = undefined

    let preprocessed = Array.isArray(source)
    let slugger = source ? new GithubSlugger() : undefined
    let combinedOptions = { ...defaultOptions, ...options }

    if (preprocessed) {
        tokens = source as Token[]
    } else {
        lexer = new Lexer(combinedOptions)
        tokens = isInline ? lexer.inlineTokens(source as string) : lexer.lex(source as string)
        parsed(tokens)
    }

    let combinedRenderers = {
        ...defaultRenderers,
        ...renderers
    }

    setContext(key, {
        slug: (val) => (slugger ? slugger.slug(val) : ''),
        getOptions: () => combinedOptions
    })
</script>

<Parser {tokens} renderers={combinedRenderers} />
