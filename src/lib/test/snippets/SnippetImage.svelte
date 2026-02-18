<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet image({ href, title, text })}
        <img src={href} alt={text} {title} data-testid="snippet-image" />
    {/snippet}
</SvelteMarkdown>
