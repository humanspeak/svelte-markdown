<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet paragraph({ children })}
        <p data-testid="snippet-paragraph">{@render children?.()}</p>
    {/snippet}
    {#snippet heading({ depth, children })}
        <div data-testid="snippet-heading" data-depth={depth}>
            {@render children?.()}
        </div>
    {/snippet}
    {#snippet link({ href, title, children })}
        <a {href} {title} target="_blank" rel="noopener noreferrer" data-testid="snippet-link"
            >{@render children?.()}</a
        >
    {/snippet}
</SvelteMarkdown>
