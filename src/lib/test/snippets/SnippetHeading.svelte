<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet heading({ depth, children })}
        <div data-testid="snippet-heading" data-depth={depth}>
            {@render children?.()}
        </div>
    {/snippet}
</SvelteMarkdown>
