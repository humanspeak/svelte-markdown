<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet html_div({ attributes, children })}
        <div {...attributes} data-testid="snippet-html-div">{@render children?.()}</div>
    {/snippet}
</SvelteMarkdown>
