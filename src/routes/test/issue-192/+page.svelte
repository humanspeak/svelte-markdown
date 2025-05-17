<script lang="ts">
    import SvelteMarkdown, { type Renderers, type Token, type TokensList } from '$lib/index.js'
    import CustomRenderer from '$lib/test/issue-192/CustomRenderer.svelte'

    let source = `
# This is a header

This is a paragraph with **bold** and <em>mixed HTML</em>.

* List item with \`inline code\`
* And a [link](https://svelte.dev)
  * With nested items
  * Supporting full markdown

  [![image](https://avatars.githubusercontent.com/u/162604590?s=64&u=548f358e716a223731ab372776a09723cf815f4d&v=4)](https://stackblitz.com/edit)
`

    const parsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }

    const renderers: Partial<Renderers> = {
        link: CustomRenderer
    }
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview">
        <SvelteMarkdown {source} {renderers} {parsed} />
    </div>
</div>

<style>
    .container {
        display: flex;
        gap: 1rem;
        width: 100%;
    }

    textarea {
        width: 50%;
        min-height: 300px;
        padding: 1rem;
        font-family: monospace;
    }

    .preview {
        width: 50%;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
</style>
