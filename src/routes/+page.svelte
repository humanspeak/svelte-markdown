<script lang="ts">
    import { default as SvelteMarkdown, type TokensList, type Token } from '$lib/index.js'
    import { onMount } from 'svelte'

    const ogText = `# Welcome to My Markdown Playground! 🎨

Hey there! This is a *fun* example of mixing **Markdown** and <em>HTML</em> together.

## Things I Love:
1. Writing in <strong>bold</strong> and _italic_
2. Making lists (like this one!)
3. Using emojis 🚀 ✨ 🌈

| Feature | Markdown | HTML |
|---------|----------|------|
| Bold | **text** | <strong>text</strong> |
| Italic | *text* | <em>text</em> |
| Links | [text](url) | <a href="url">text</a> |

Here's a quote for you:
> "The best of both worlds" - <cite>Someone who loves markdown & HTML</cite>

You can even use <sup>superscript</sup> and <sub>subscript</sub> text!

---

<details>
<summary>Want to see something cool?</summary>
Here's a hidden surprise! 🎉
</details>

Happy coding! <span style="color: hotpink">♥</span>`

    let source = $state(ogText)
    let value = $state(ogText)
    let browser = $state(false)

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

<div>
    <textarea bind:value onkeyup={onKeyupTextArea}></textarea>
</div>
<div>
    Server:
    <SvelteMarkdown {source} parsed={showParsed} />
</div>
<div>
    Browser:
    {#if browser}
        <SvelteMarkdown {source} parsed={showParsed} />
    {/if}
</div>
