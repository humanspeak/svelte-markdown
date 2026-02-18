<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet html_click({ attributes, children })}
        <button {...attributes} data-testid="custom-tag-snippet">{@render children?.()}</button>
    {/snippet}
</SvelteMarkdown>
