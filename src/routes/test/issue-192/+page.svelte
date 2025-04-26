<script lang="ts">
    import SvelteMarkdown, { type Renderers } from '$lib/index.js'
    import CustomRenderer from '$lib/test/issue-192/CustomRenderer.svelte'

    let source = `
# This is a header

This is a paragraph with **bold** and <em>mixed HTML</em>.

* List item with \`inline code\`
* And a [link](https://svelte.dev)
  * With nested items
  * Supporting full markdown

[![MPF](https://humanspeak.com/jason.jpg)](https://humanspeak.com/jason.jpg)
`

    const renderers: Partial<Renderers> = {
        link: CustomRenderer
    }
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview">
        <SvelteMarkdown {source} {renderers} />
    </div>
</div>
