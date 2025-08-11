<script lang="ts">
    import SvelteMarkdown, { allowRenderersOnly, buildUnsupportedHTML } from '$lib/index.js'

    const { source } = $props()
</script>

<SvelteMarkdown
    {source}
    renderers={{
        // Allow only strong, em, link, code (markdown renderers)
        ...allowRenderersOnly(['strong', 'em', 'link', 'code', 'list', 'listitem']),
        // Allow only strong, em, link(a), code (HTML tags)
        html: buildUnsupportedHTML()
    }}
/>
