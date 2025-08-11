<script lang="ts">
    import SvelteMarkdown, { type Renderers, type Token, type TokensList } from '$lib/index.js'
    import CustomList from '$lib/test/issues/issue-195/CustomList.svelte'
    import CustomListItem from '$lib/test/issues/issue-195/CustomListItem.svelte'

    let source = `
* List item with \`inline code\`
* And a [link](https://svelte.dev)
  * With nested items
  * Supporting full markdown
  * And a checkbox
`

    const parsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }

    const renderers: Partial<Renderers> = {
        list: CustomList,
        listitem: CustomListItem
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
