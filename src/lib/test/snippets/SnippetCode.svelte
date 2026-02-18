<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet code({ lang, text })}
        <pre data-testid="snippet-code" data-lang={lang}><code>{text}</code></pre>
    {/snippet}
</SvelteMarkdown>
