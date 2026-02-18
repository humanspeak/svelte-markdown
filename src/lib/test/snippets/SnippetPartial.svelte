<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet paragraph({ children })}
        <p data-testid="snippet-paragraph">{@render children?.()}</p>
    {/snippet}
</SvelteMarkdown>
