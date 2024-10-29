<script lang="ts">
    import Parser from './Parser.svelte'
    import type { Renderers, Token, TokensList, Tokens } from './utils/markdown-parser.js'

    interface Props {
        type?: string
        tokens?: Token[] | TokensList
        header?: Tokens.TableCell[]
        rows?: Tokens.TableCell[][]
        ordered?: boolean
        renderers: Renderers
    }

    const {
        type = undefined,
        tokens = undefined,
        header = undefined,
        rows = undefined,
        ordered = false,
        renderers,
        ...rest
    }: Props & {
        [key: string]: unknown
    } = $props()
</script>

{#if !type}
    {#if tokens}
        {#each tokens as token}
            {@const { text, raw, ...parserRest } = rest}
            <Parser {...token} {renderers} {...parserRest} />
        {/each}
    {/if}
{:else if type in renderers}
    {#if type === 'table'}
        <renderers.table {...rest}>
            <renderers.tablehead {...rest}>
                <renderers.tablerow {...rest}>
                    {#each header ?? [] as headerItem, i}
                        <renderers.tablecell
                            header={true}
                            align={rest.align[i] || 'center'}
                            {...rest}
                        >
                            <Parser tokens={headerItem.tokens} {renderers} />
                        </renderers.tablecell>
                    {/each}
                </renderers.tablerow>
            </renderers.tablehead>
            <renderers.tablebody {...rest}>
                {#each rows ?? [] as row}
                    <renderers.tablerow {...rest}>
                        {#each row ?? [] as cells, i}
                            <renderers.tablecell
                                header={false}
                                align={rest.align[i] || 'center'}
                                {...rest}
                            >
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
                {@const items = rest.items as Props[]}
                {#each items as item}
                    {@const SvelteComponent = renderers.orderedlistitem || renderers.listitem}
                    <SvelteComponent {...item}>
                        <Parser tokens={item.tokens} {renderers} />
                    </SvelteComponent>
                {/each}
            </renderers.list>
        {:else}
            <renderers.list {ordered} {...rest}>
                {@const items = rest.items as Props[]}
                {#each items as item}
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
                {@const { text, raw, ...parserRest } = rest}
                <Parser {tokens} {renderers} {...parserRest} />
            {:else}
                {rest.raw}
            {/if}
        </SvelteComponent_2>
    {/if}
{/if}
