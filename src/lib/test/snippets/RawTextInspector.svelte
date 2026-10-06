<script lang="ts">
    import SvelteMarkdown from '../../SvelteMarkdown.svelte'
    const { source = 'Hello world' }: { source?: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet rawtext({ text })}<span data-testid="rawtext-marker">{text}</span>{/snippet}
</SvelteMarkdown>
