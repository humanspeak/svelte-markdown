<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet paragraph({ children })}
        <p class="custom-paragraph" data-testid="snippet-paragraph">{@render children?.()}</p>
    {/snippet}
</SvelteMarkdown>
