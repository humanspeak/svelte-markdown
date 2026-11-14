<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    // E2E page for the nesting-depth guard (HUM-132).
    const sources = {
        quotes: '> '.repeat(500) + 'deep',
        lists: Array.from({ length: 200 }, (_, i) => '  '.repeat(i) + '- item').join('\n'),
        tags: '<div>'.repeat(500) + 'deep' + '</div>'.repeat(500),
        lexer: '> '.repeat(20000) + 'deep'
    }
    type Key = keyof typeof sources

    let selected = $state<Key | undefined>(undefined)
</script>

<div class="buttons">
    {#each Object.keys(sources) as key (key)}
        <button data-testid={`load-${key}`} onclick={() => (selected = key as Key)}>{key}</button>
    {/each}
</div>

<div data-testid="markdown-output">
    {#if selected}
        {#key selected}
            <svelte:boundary>
                <SvelteMarkdown source={sources[selected]} />
                {#snippet failed(error)}
                    <p data-testid="render-error">{(error as Error)?.name}</p>
                {/snippet}
            </svelte:boundary>
        {/key}
    {/if}
</div>
