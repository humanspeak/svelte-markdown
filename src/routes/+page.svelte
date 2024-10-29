<script lang="ts">
    import { default as SvelteMarkdown, type TokensList, type Token } from '$lib/index.js'

    let source = $state('**Hello World**')
    let counter = 0

    const clickButton = async () => {
        source = `Jason! 👋 x ${counter++}`
    }

    const showParsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }
</script>

<SvelteMarkdown {source} parsed={showParsed} />

<button onclick={clickButton}>Click me</button>
