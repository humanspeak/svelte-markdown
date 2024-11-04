<script lang="ts">
    import { default as SvelteMarkdown, type TokensList, type Token } from '$lib/index.js'
    import { onMount } from 'svelte'

    const ogText = `| And this is | A table |
|-|-|
| With two | columns |`
    let source = $state(ogText)
    let value = $state(ogText)
    let browser = false

    const onKeyupTextArea = async () => {
        source = value
    }

    const showParsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }

    onMount(() => {
        browser = true
    })
</script>

<textarea bind:value onkeyup={onKeyupTextArea}></textarea>

Server:
<SvelteMarkdown {source} parsed={showParsed} />

Browser:
{#if browser}
    <SvelteMarkdown {source} parsed={showParsed} />
{/if}
