<script lang="ts">
    import Parser from './Parser.svelte'
    import type { Renderers, Token, TokensList } from './utils/markdown-parser.js'

    interface Props {
        type?: string
        tokens?: Token[] | TokensList
        header?: any[]
        rows?: any[]
        ordered?: boolean
        renderers: Renderers
        raw?: string
        text?: string
    }

    let {
        type = undefined,
        tokens = undefined,
        header = undefined,
        rows = undefined,
        ordered = false,
        renderers,
        raw,
        text,
        ...rest
    }: Props & { [key: string]: any } = $props()

    $inspect(type, tokens, header, rows, ordered, renderers, rest)
</script>

{#if !type}
    {#if tokens}
        {#each tokens as token}
            <Parser {...token} {renderers} {...rest} />
        {/each}
    {/if}
{:else if type in renderers && renderers.hasOwnProperty(type)}
    {#if type === 'table'}
        <renderers.table>
            <renderers.tablehead>
                <renderers.tablerow>
                    {#each header as headerItem, i}
                        <renderers.tablecell header={true} align={rest.align[i] || 'center'}>
                            <Parser tokens={headerItem.tokens} {renderers} />
                        </renderers.tablecell>
                    {/each}
                </renderers.tablerow>
            </renderers.tablehead>
            <renderers.tablebody>
                {#each rows as row}
                    <renderers.tablerow>
                        {#each row as cells, i}
                            <renderers.tablecell header={false} align={rest.align[i] || 'center'}>
                                <Parser tokens={cells.tokens} {renderers} />
                            </renderers.tablecell>
                        {/each}
                    </renderers.tablerow>
                {/each}
            </renderers.tablebody>
        </renderers.table>
    {:else if type === 'list'}
        {#if ordered}
            <renderers.list {ordered} {...rest}>
                {#each rest.items as item}
                    {@const SvelteComponent = renderers.orderedlistitem || renderers.listitem}
                    <SvelteComponent {...item}>
                        <Parser tokens={item.tokens} {renderers} />
                    </SvelteComponent>
                {/each}
            </renderers.list>
        {:else}
            <renderers.list {ordered} {...rest}>
                {#each rest.items as item}
                    {@const SvelteComponent_1 = renderers.unorderedlistitem || renderers.listitem}
                    <SvelteComponent_1 {...item} {...rest}>
                        <Parser tokens={item.tokens} {renderers} {...rest} />
                    </SvelteComponent_1>
                {/each}
            </renderers.list>
        {/if}
    {:else}
        {@const SvelteComponent_2 = renderers[type]}
        <SvelteComponent_2 {...rest}>
            {#if tokens}
                <Parser {tokens} {renderers} {...rest} />
            {:else}
                {raw}
            {/if}
        </SvelteComponent_2>
    {/if}
{/if}
