<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet blockquote({ children })}
        <blockquote class="custom-quote" data-testid="snippet-blockquote">
            {@render children?.()}
        </blockquote>
    {/snippet}
</SvelteMarkdown>
