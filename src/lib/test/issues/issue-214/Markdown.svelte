<script lang="ts">
    import SvelteMarkdown, { allowRenderersOnly, buildUnsupportedHTML } from '$lib/index.js'

    const { source } = $props()
</script>

<SvelteMarkdown
    {source}
    renderers={{
        // Allow only the minimal markdown set needed for inline formatting
        // paragraph/text wrappers are required for inline tokens to render
        ...allowRenderersOnly(['paragraph', 'text', 'strong', 'em', 'link', 'codespan']),
        // Allow only strong, em, link(a), code (HTML tags)
        html: buildUnsupportedHTML()
    }}
/>
