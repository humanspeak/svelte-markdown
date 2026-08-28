<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
</script>

<SvelteMarkdown source="A <div>x</div>">
    {#snippet html_DIV({ children }: { children?: import('svelte').Snippet })}
        <section data-snippet="upper">{@render children?.()}</section>
    {/snippet}
</SvelteMarkdown>
