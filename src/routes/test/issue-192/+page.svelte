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

[![MPF](https://avatars.githubusercontent.com/u/162604590?u=548f358e716a223731ab372776a09723cf815f4d&v=4&size=80)](https://avatars.githubusercontent.com/u/162604590?u=548f358e716a223731ab372776a09723cf815f4d&v=4&size=80)
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
