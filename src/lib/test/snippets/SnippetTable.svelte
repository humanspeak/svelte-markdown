<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet table({ children })}
        <table data-testid="snippet-table">{@render children?.()}</table>
    {/snippet}
    {#snippet tablehead({ children })}
        <thead data-testid="snippet-tablehead">{@render children?.()}</thead>
    {/snippet}
    {#snippet tablebody({ children })}
        <tbody data-testid="snippet-tablebody">{@render children?.()}</tbody>
    {/snippet}
    {#snippet tablerow({ children })}
        <tr data-testid="snippet-tablerow">{@render children?.()}</tr>
    {/snippet}
    {#snippet tablecell({ header, align, children })}
        {#if header}
            <th data-testid="snippet-tablecell" style:text-align={align}>{@render children?.()}</th>
        {:else}
            <td data-testid="snippet-tablecell" style:text-align={align}>{@render children?.()}</td>
        {/if}
    {/snippet}
</SvelteMarkdown>
