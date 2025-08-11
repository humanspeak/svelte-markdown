<script lang="ts">
    import SvelteMarkdown, { allowRenderersOnly, buildUnsupportedHTML } from '$lib/index.js'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown
    {source}
    renderers={{
        // Allow only the minimal markdown set needed for inline formatting
        // paragraph/text wrappers are required for inline tokens to render
        ...allowRenderersOnly(['paragraph', 'text', 'strong', 'em', 'link', 'codespan']),
        html: buildUnsupportedHTML()
    }}
/>
