<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet html_a({ attributes, children })}
        <a {...attributes} data-testid="snippet-html-a" target="_blank" rel="noopener noreferrer"
            >{@render children?.()}</a
        >
    {/snippet}
</SvelteMarkdown>
