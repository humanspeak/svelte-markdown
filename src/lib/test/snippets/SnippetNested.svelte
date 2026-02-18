<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet blockquote({ children })}
        <blockquote data-testid="snippet-blockquote">{@render children?.()}</blockquote>
    {/snippet}
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
    {#snippet link({ href, title, children })}
        <a {href} {title} target="_blank" rel="noopener noreferrer" data-testid="snippet-link"
            >{@render children?.()}</a
        >
    {/snippet}
</SvelteMarkdown>
