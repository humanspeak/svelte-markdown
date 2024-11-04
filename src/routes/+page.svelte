<script lang="ts">
    import { default as SvelteMarkdown, type TokensList, type Token } from '$lib/index.js'

    const ogText = `| And this is | A table |
|-|-|
| With two | columns |`
    let source = $state(ogText)
    let value = $state(ogText)

    const onKeyupTextArea = async () => {
        source = value
    }

    const showParsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }
</script>

<textarea bind:value onkeyup={onKeyupTextArea}></textarea>

<SvelteMarkdown {source} parsed={showParsed} />
