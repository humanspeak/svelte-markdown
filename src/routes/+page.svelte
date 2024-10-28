<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { TokensList } from 'marked'
    import type { Token } from 'marked'

    let source = $state('**Hello World**')
    let counter = 0

    const clickButton = async () => {
        source = `Jason! 👋 x ${counter++}`
    }

    const showParsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('parsedTokens', parsedTokens)
    }
</script>

<SvelteMarkdown {source} parsed={showParsed} />

<button onclick={clickButton}>Click me</button>
