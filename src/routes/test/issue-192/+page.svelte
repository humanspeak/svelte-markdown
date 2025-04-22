<script lang="ts">
    import SvelteMarkdown, { type Renderers } from '$lib/index.js'
    import CustomRenderer from '$lib/test/issue-192/CustomRenderer.svelte'

    const source = `
# This is a header

This is a paragraph with **bold** and <em>mixed HTML</em>.

* List item with \`inline code\`
* And a [link](https://svelte.dev)
  * With nested items
  * Supporting full markdown
`

    const renderers: Partial<Renderers> = {
        link: CustomRenderer
    }
</script>

<SvelteMarkdown {source} {renderers} />
