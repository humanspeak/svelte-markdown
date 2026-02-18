<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import ComponentParagraph from './ComponentParagraph.svelte'

    const { source }: { source: string } = $props()
    const renderers = { paragraph: ComponentParagraph }
</script>

<SvelteMarkdown {source} {renderers}>
    {#snippet paragraph({ children })}
        <p data-testid="snippet-paragraph">{@render children?.()}</p>
    {/snippet}
</SvelteMarkdown>
