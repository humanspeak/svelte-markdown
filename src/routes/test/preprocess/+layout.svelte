<script lang="ts">
    import { setMarkdownDocumentContext } from '$lib/preprocess/context.js'
    import CustomHeading from './CustomHeading.svelte'
    import CustomLink from './CustomLink.svelte'

    const { children } = $props()

    // The issue #372 ask: custom components declared once in a layout.
    setMarkdownDocumentContext({
        renderers: { heading: CustomHeading, link: CustomLink }
    })
</script>

{@render children()}
