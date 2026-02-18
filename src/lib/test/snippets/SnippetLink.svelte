<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet link({ href, title, children })}
        <a {href} {title} target="_blank" rel="noopener noreferrer" data-testid="snippet-link"
            >{@render children?.()}</a
        >
    {/snippet}
</SvelteMarkdown>
