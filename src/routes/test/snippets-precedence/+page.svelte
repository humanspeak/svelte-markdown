<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import CustomParagraph from '$lib/test/snippets/ComponentParagraph.svelte'

    const source = 'Test paragraph for precedence'
    const renderers = { paragraph: CustomParagraph }
</script>

<div data-testid="precedence-test">
    <SvelteMarkdown {source} {renderers}>
        {#snippet paragraph({ children })}
            <p data-testid="snippet-wins">{@render children?.()}</p>
        {/snippet}
    </SvelteMarkdown>
</div>
