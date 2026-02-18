<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet list({ ordered, children })}
        {#if ordered}
            <ol data-testid="snippet-list">{@render children?.()}</ol>
        {:else}
            <ul data-testid="snippet-list">{@render children?.()}</ul>
        {/if}
    {/snippet}
    {#snippet listitem({ children })}
        <li data-testid="snippet-listitem">{@render children?.()}</li>
    {/snippet}
</SvelteMarkdown>
