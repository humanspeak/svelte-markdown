<script lang="ts">
    /**
     * @component Parser
     *
     * Recursive markdown token parser that transforms tokens into Svelte components.
     * This component is the core rendering engine of the markdown system, handling
     * the transformation of parsed markdown tokens into their corresponding Svelte components.
     *
     * @example
     * ```svelte
     * <Parser
     *   tokens={parsedTokens}
     *   renderers={customRenderers}
     *   type="paragraph"
     * />
     * ```
     *
     * Features:
     * - Recursive token parsing
     * - Custom renderer support
     * - Snippet-based renderer overrides (snippet > component > default)
     * - Special handling for tables, lists, and HTML content
     * - Type-safe component rendering
     *
     * @typedef {Object} Props
     * @property {string} [type] - Token type for direct component rendering
     * @property {Token[] | TokensList} [tokens] - Markdown tokens to be rendered
     * @property {Tokens.TableCell[]} [header] - Table header cells for table rendering
     * @property {Tokens.TableCell[][]} [rows] - Table row cells for table rendering
     * @property {boolean} [ordered=false] - Whether the list is ordered (for list rendering)
     * @property {Renderers} renderers - Component mapping for markdown elements
     * @property {Record<string, any>} [snippetOverrides] - Snippet overrides for markdown renderers
     * @property {Record<string, any>} [htmlSnippetOverrides] - Snippet overrides for HTML tag renderers
     *
     * Implementation Notes:
     * - Uses recursive rendering for nested tokens
     * - Implements special logic for tables, lists, and HTML content
     * - Handles component prop spreading carefully to avoid conflicts
     * - Maintains type safety through TypeScript interfaces
     * - HTML token handling in table cells uses type assertions for better type safety
     * - Table cell HTML content is processed with proper token nesting and attribute preservation
     * - Improved HTML component rendering with proper type checking for tag properties
     * - Added support for nested markdown within HTML table cells (see test at lines 311-343 in SvelteMarkdown.test.ts)
     * - Token cleanup utilities handle complex nested structures (see lines 105-127 in token-cleanup.test.ts)
     * - HTML parsing maintains proper structure for both simple and complex nested elements
     *
     */

    import Parser from '$lib/Parser.svelte'
    import Html from '$lib/renderers/html/index.js'
    import type {
        Renderers,
        Token,
        TokensList,
        Tokens,
        RendererComponent
    } from '$lib/utils/markdown-parser.js'

    interface Props<T extends Renderers = Renderers> {
        type?: string
        tokens?: Token[] | TokensList
        header?: Tokens.TableCell[]
        rows?: Tokens.TableCell[][]
        ordered?: boolean
        renderers: T
        snippetOverrides?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        htmlSnippetOverrides?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const {
        type = undefined,
        tokens = undefined,
        header = undefined,
        rows = undefined,
        ordered = false,
        renderers,
        snippetOverrides = {},
        htmlSnippetOverrides = {},
        ...rest
    }: Props & {
        [key: string]: unknown
    } = $props()
</script>

{#if !type}
    {#if tokens}
        {#each tokens as token, index (index)}
            {@const { text: _text, raw: _raw, tokens: _tokens, ...parserRest } = rest}
            <Parser
                {...parserRest}
                {...token}
                {renderers}
                {snippetOverrides}
                {htmlSnippetOverrides}
            />
        {/each}
    {/if}
{:else if type in renderers}
    {#if type === 'table'}
        {#if renderers.table && renderers.tablerow && renderers.tablecell}
            {@const tableSnippet = snippetOverrides[type]}
            {@const theadSnippet = snippetOverrides['tablehead']}
            {@const tbodySnippet = snippetOverrides['tablebody']}
            {@const rowSnippet = snippetOverrides['tablerow']}
            {@const cellSnippet = snippetOverrides['tablecell']}

            {#snippet tableContent()}
                {#if renderers.tablehead}
                    {#snippet theadContent()}
                        {#snippet headerRowContent()}
                            {#each header ?? [] as headerItem, i (i)}
                                {@const { align: _align, ...cellRest } = rest}
                                {#snippet headerCellContent()}
                                    <Parser
                                        tokens={headerItem.tokens}
                                        {renderers}
                                        {snippetOverrides}
                                        {htmlSnippetOverrides}
                                    />
                                {/snippet}
                                {#if cellSnippet}
                                    {@render cellSnippet({
                                        header: true,
                                        align: (rest.align as string[])[i],
                                        ...cellRest,
                                        children: headerCellContent
                                    })}
                                {:else}
                                    <renderers.tablecell
                                        header={true}
                                        align={(rest.align as string[])[i]}
                                        {...cellRest}
                                    >
                                        {@render headerCellContent()}
                                    </renderers.tablecell>
                                {/if}
                            {/each}
                        {/snippet}
                        {#if rowSnippet}
                            {@render rowSnippet({ ...rest, children: headerRowContent })}
                        {:else}
                            <renderers.tablerow {...rest}>
                                {@render headerRowContent()}
                            </renderers.tablerow>
                        {/if}
                    {/snippet}
                    {#if theadSnippet}
                        {@render theadSnippet({ ...rest, children: theadContent })}
                    {:else}
                        <renderers.tablehead {...rest}>
                            {@render theadContent()}
                        </renderers.tablehead>
                    {/if}
                {/if}
                {#if renderers.tablebody}
                    {#snippet tbodyContent()}
                        {#each rows ?? [] as row, i (i)}
                            {#snippet bodyRowContent()}
                                {#each row ?? [] as cells, j (j)}
                                    {@const { align: _align, ...cellRest } = rest}
                                    {#snippet bodyCellContent()}
                                        {#each cells.tokens ?? [] as cellToken, index (index)}
                                            <Parser
                                                {...cellRest}
                                                {...cellToken}
                                                {renderers}
                                                {snippetOverrides}
                                                {htmlSnippetOverrides}
                                            />
                                        {/each}
                                    {/snippet}
                                    {#if cellSnippet}
                                        {@render cellSnippet({
                                            header: false,
                                            align: (rest.align as string[])[j],
                                            ...cellRest,
                                            children: bodyCellContent
                                        })}
                                    {:else}
                                        <renderers.tablecell
                                            {...cellRest}
                                            header={false}
                                            align={(rest.align as string[])[j]}
                                        >
                                            {@render bodyCellContent()}
                                        </renderers.tablecell>
                                    {/if}
                                {/each}
                            {/snippet}
                            {#if rowSnippet}
                                {@render rowSnippet({ ...rest, children: bodyRowContent })}
                            {:else}
                                <renderers.tablerow {...rest}>
                                    {@render bodyRowContent()}
                                </renderers.tablerow>
                            {/if}
                        {/each}
                    {/snippet}
                    {#if tbodySnippet}
                        {@render tbodySnippet({ ...rest, children: tbodyContent })}
                    {:else}
                        <renderers.tablebody {...rest}>
                            {@render tbodyContent()}
                        </renderers.tablebody>
                    {/if}
                {/if}
            {/snippet}

            {#if tableSnippet}
                {@render tableSnippet({ ...rest, children: tableContent })}
            {:else}
                <renderers.table {...rest}>
                    {@render tableContent()}
                </renderers.table>
            {/if}
        {/if}
    {:else if type === 'list' && renderers.list}
        {@const listSnippet = snippetOverrides['list']}

        {#if ordered}
            {#snippet orderedListContent()}
                {@const { items: _items, ...parserRest } = rest}
                {@const items = (_items as Props[] | undefined) ?? []}
                {#each items as item, index (index)}
                    {@const OrderedListComponent = renderers.orderedlistitem || renderers.listitem}
                    {@const orderedItemSnippet =
                        snippetOverrides['orderedlistitem'] || snippetOverrides['listitem']}
                    {#snippet orderedItemContent()}
                        <Parser
                            {...parserRest}
                            tokens={item.tokens}
                            {renderers}
                            {snippetOverrides}
                            {htmlSnippetOverrides}
                        />
                    {/snippet}
                    {#if orderedItemSnippet}
                        {@render orderedItemSnippet({ ...item, children: orderedItemContent })}
                    {:else if OrderedListComponent}
                        <OrderedListComponent {...item}>
                            {@render orderedItemContent()}
                        </OrderedListComponent>
                    {/if}
                {/each}
            {/snippet}
            {#if listSnippet}
                {@render listSnippet({ ordered, ...rest, children: orderedListContent })}
            {:else}
                <renderers.list {ordered} {...rest}>
                    {@render orderedListContent()}
                </renderers.list>
            {/if}
        {:else}
            {#snippet unorderedListContent()}
                {@const { items: _items, ...parserRest } = rest}
                {@const items = (_items as Props[] | undefined) ?? []}
                {#each items as item, index (index)}
                    {@const UnorderedListComponent =
                        renderers.unorderedlistitem || renderers.listitem}
                    {@const unorderedItemSnippet =
                        snippetOverrides['unorderedlistitem'] || snippetOverrides['listitem']}
                    {#snippet unorderedItemContent()}
                        <Parser
                            {...parserRest}
                            tokens={item.tokens}
                            {renderers}
                            {snippetOverrides}
                            {htmlSnippetOverrides}
                        />
                    {/snippet}
                    {#if unorderedItemSnippet}
                        {@render unorderedItemSnippet({ ...item, children: unorderedItemContent })}
                    {:else if UnorderedListComponent}
                        <UnorderedListComponent {...item}>
                            {@render unorderedItemContent()}
                        </UnorderedListComponent>
                    {/if}
                {/each}
            {/snippet}
            {#if listSnippet}
                {@render listSnippet({ ordered, ...rest, children: unorderedListContent })}
            {:else}
                <renderers.list {ordered} {...rest}>
                    {@render unorderedListContent()}
                </renderers.list>
            {/if}
        {/if}
    {:else if type === 'html'}
        {@const { tag, ...localRest } = rest}
        {@const htmlTag = rest.tag as keyof typeof Html}
        {@const htmlSnippet = htmlSnippetOverrides[htmlTag as string]}
        {#if htmlSnippet}
            {#snippet htmlSnippetChildren()}
                {#if tokens && (tokens as Token[]).length}
                    <Parser
                        tokens={tokens as Token[]}
                        {renderers}
                        {snippetOverrides}
                        {htmlSnippetOverrides}
                        {...Object.fromEntries(
                            Object.entries(localRest).filter(([key]) => key !== 'attributes')
                        )}
                    />
                {:else}
                    <renderers.rawtext text={rest.raw} {...rest} />
                {/if}
            {/snippet}
            {@render htmlSnippet({ attributes: rest.attributes, children: htmlSnippetChildren })}
        {:else if renderers.html && htmlTag in renderers.html}
            {@const HtmlComponent = renderers.html[htmlTag as keyof typeof renderers.html]}
            {#if HtmlComponent}
                <HtmlComponent {...rest}>
                    {#if tokens && (tokens as Token[]).length}
                        <Parser
                            tokens={tokens as Token[]}
                            {renderers}
                            {snippetOverrides}
                            {htmlSnippetOverrides}
                            {...Object.fromEntries(
                                Object.entries(localRest).filter(([key]) => key !== 'attributes')
                            )}
                        />
                    {:else}
                        <renderers.rawtext text={rest.raw} {...rest} />
                    {/if}
                </HtmlComponent>
            {/if}
        {:else}
            <Parser
                tokens={(tokens as Token[]) ?? ([] as Token[])}
                {renderers}
                {snippetOverrides}
                {htmlSnippetOverrides}
                {...Object.fromEntries(
                    Object.entries(localRest).filter(([key]) => key !== 'tokens')
                )}
            />
        {/if}
    {:else}
        {@const GeneralComponent = renderers[type as keyof typeof renderers] as RendererComponent}
        {@const typeSnippet = snippetOverrides[type]}

        {#snippet renderChildren()}
            {#if tokens}
                {@const { text: _text, raw: _raw, ...parserRest } = rest}
                <Parser
                    {...parserRest}
                    {tokens}
                    {renderers}
                    {snippetOverrides}
                    {htmlSnippetOverrides}
                />
            {:else}
                <renderers.rawtext text={rest.raw} {...rest} />
            {/if}
        {/snippet}

        {#if typeSnippet}
            {@render typeSnippet({ ...rest, children: renderChildren })}
        {:else if GeneralComponent}
            <GeneralComponent {...rest}>
                {@render renderChildren()}
            </GeneralComponent>
        {/if}
    {/if}
{/if}
