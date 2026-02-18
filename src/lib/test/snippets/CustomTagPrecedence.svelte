<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import ClickRenderer from './ClickRenderer.svelte'

    const { source }: { source: string } = $props()
    const renderers = { html: { click: ClickRenderer } }
</script>

<SvelteMarkdown {source} {renderers}>
    {#snippet html_click({ attributes, children })}
        <button {...attributes} data-testid="custom-tag-snippet">{@render children?.()}</button>
    {/snippet}
</SvelteMarkdown>
