<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet html_div({ children }: { children?: import('svelte').Snippet })}
        <section data-snippet="div">{@render children?.()}</section>
    {/snippet}
</SvelteMarkdown>
