<script lang="ts">
    import Parser from './Parser.svelte'
    import Html from './renderers/html/index.js'
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
                            {rest.align[i]}
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
                                align={rest.align[i] ?? 'center'}
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
                    {@const OrderedListComponent = renderers.orderedlistitem || renderers.listitem}
                    <OrderedListComponent {...item}>
                        <Parser tokens={item.tokens} {renderers} />
                    </OrderedListComponent>
                {/each}
            </renderers.list>
        {:else}
            <renderers.list {ordered} {...rest}>
                {@const items = rest.items as Props[]}
                {#each items as item}
                    {@const UnorderedListComponent =
                        renderers.unorderedlistitem || renderers.listitem}
                    <UnorderedListComponent {...item} {...rest}>
                        <Parser tokens={item.tokens} {renderers} {...rest} />
                    </UnorderedListComponent>
                {/each}
            </renderers.list>
        {/if}
    {:else if type === 'html'}
        {@const { tag, ...localRest } = rest}
        {@const htmlTag = rest.tag as keyof typeof Html}
        {#if htmlTag in Html}
            {@const HtmlComponent = Html[htmlTag]}
            {@const tokens = (rest.tokens as Token[]) ?? ([] as Token[])}
            <HtmlComponent {...rest}>
                {#if tokens.length}
                    <Parser {tokens} {renderers} {...localRest} />
                {/if}
            </HtmlComponent>
        {:else}
            <Parser
                tokens={(rest.tokens as Token[]) ?? ([] as Token[])}
                {renderers}
                {...localRest}
            />
        {/if}
    {:else}
        {@const GeneralComponent = renderers[type]}
        <GeneralComponent {...rest}>
            {#if tokens}
                {@const { text, raw, ...parserRest } = rest}
                <Parser {tokens} {renderers} {...parserRest} />
            {:else}
                {rest.raw}
            {/if}
        </GeneralComponent>
    {/if}
{/if}
