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
    import {
        defaultSanitizeAttributes,
        defaultSanitizeUrl,
        type SanitizeAttributesFn,
        type SanitizeUrlFn
    } from '$lib/utils/sanitize.js'

    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    type AnySnippet = (..._args: any[]) => any

    interface Props<T extends Renderers = Renderers> {
        type?: string
        tokens?: Token[] | TokensList
        header?: Tokens.TableCell[]
        rows?: Tokens.TableCell[][]
        ordered?: boolean
        renderers: T
        snippetOverrides?: Record<string, AnySnippet>
        htmlSnippetOverrides?: Record<string, AnySnippet>
        sanitizeUrl?: SanitizeUrlFn
        sanitizeAttributes?: SanitizeAttributesFn
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
        sanitizeUrl = defaultSanitizeUrl,
        sanitizeAttributes = defaultSanitizeAttributes,
        ...rest
    }: Props & {
        [key: string]: unknown
    } = $props()

    // Sanitize rest props before they reach any renderer or snippet.
    // This is the single enforcement point — custom renderers cannot bypass it.
    const sanitizedRest = $derived.by(() => {
        if ((type === 'link' || type === 'image') && typeof rest.href === 'string') {
            const tag = type === 'link' ? 'a' : 'img'
            return { ...rest, href: sanitizeUrl(rest.href, { type, tag }) }
        }
        if (type === 'html' && rest.attributes) {
            const tag = (rest.tag as string) ?? ''
            return {
                ...rest,
                attributes: sanitizeAttributes(
                    rest.attributes as Record<string, string>,
                    { type, tag },
                    sanitizeUrl
                )
            }
        }
        return rest
    })
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
                {sanitizeUrl}
                {sanitizeAttributes}
            />
        {/each}
    {/if}
{:else if type in renderers || type in snippetOverrides}
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
                                {@const { align: _align, ...cellRest } = sanitizedRest}
                                {#snippet headerCellContent()}
                                    <Parser
                                        tokens={headerItem.tokens}
                                        {renderers}
                                        {snippetOverrides}
                                        {htmlSnippetOverrides}
                                        {sanitizeUrl}
                                        {sanitizeAttributes}
                                    />
                                {/snippet}
                                {#if cellSnippet}
                                    {@render cellSnippet({
                                        header: true,
                                        align:
                                            (sanitizedRest.align as string[] | undefined)?.[i] ??
                                            null,
                                        ...cellRest,
                                        children: headerCellContent
                                    })}
                                {:else}
                                    <renderers.tablecell
                                        header={true}
                                        align={(sanitizedRest.align as string[] | undefined)?.[i] ??
                                            null}
                                        {...cellRest}
                                    >
                                        {@render headerCellContent()}
                                    </renderers.tablecell>
                                {/if}
                            {/each}
                        {/snippet}
                        {#if rowSnippet}
                            {@render rowSnippet({ ...sanitizedRest, children: headerRowContent })}
                        {:else}
                            <renderers.tablerow {...sanitizedRest}>
                                {@render headerRowContent()}
                            </renderers.tablerow>
                        {/if}
                    {/snippet}
                    {#if theadSnippet}
                        {@render theadSnippet({ ...sanitizedRest, children: theadContent })}
                    {:else}
                        <renderers.tablehead {...sanitizedRest}>
                            {@render theadContent()}
                        </renderers.tablehead>
                    {/if}
                {/if}
                {#if renderers.tablebody}
                    {#snippet tbodyContent()}
                        {#each rows ?? [] as row, i (i)}
                            {#snippet bodyRowContent()}
                                {#each row ?? [] as cells, j (j)}
                                    {@const { align: _align, ...cellRest } = sanitizedRest}
                                    {#snippet bodyCellContent()}
                                        {#each cells.tokens ?? [] as cellToken, index (index)}
                                            <Parser
                                                {...cellRest}
                                                {...cellToken}
                                                {renderers}
                                                {snippetOverrides}
                                                {htmlSnippetOverrides}
                                                {sanitizeUrl}
                                                {sanitizeAttributes}
                                            />
                                        {/each}
                                    {/snippet}
                                    {#if cellSnippet}
                                        {@render cellSnippet({
                                            header: false,
                                            align:
                                                (sanitizedRest.align as string[] | undefined)?.[
                                                    j
                                                ] ?? null,
                                            ...cellRest,
                                            children: bodyCellContent
                                        })}
                                    {:else}
                                        <renderers.tablecell
                                            {...cellRest}
                                            header={false}
                                            align={(sanitizedRest.align as string[] | undefined)?.[
                                                j
                                            ] ?? null}
                                        >
                                            {@render bodyCellContent()}
                                        </renderers.tablecell>
                                    {/if}
                                {/each}
                            {/snippet}
                            {#if rowSnippet}
                                {@render rowSnippet({ ...sanitizedRest, children: bodyRowContent })}
                            {:else}
                                <renderers.tablerow {...sanitizedRest}>
                                    {@render bodyRowContent()}
                                </renderers.tablerow>
                            {/if}
                        {/each}
                    {/snippet}
                    {#if tbodySnippet}
                        {@render tbodySnippet({ ...sanitizedRest, children: tbodyContent })}
                    {:else}
                        <renderers.tablebody {...sanitizedRest}>
                            {@render tbodyContent()}
                        </renderers.tablebody>
                    {/if}
                {/if}
            {/snippet}

            {#if tableSnippet}
                {@render tableSnippet({ ...sanitizedRest, children: tableContent })}
            {:else}
                <renderers.table {...sanitizedRest}>
                    {@render tableContent()}
                </renderers.table>
            {/if}
        {/if}
    {:else if type === 'list' && renderers.list}
        {@const listSnippet = snippetOverrides['list']}

        {#if ordered}
            {#snippet orderedListContent()}
                {@const { items: _items, ...parserRest } = sanitizedRest}
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
                            {sanitizeUrl}
                            {sanitizeAttributes}
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
                {@render listSnippet({ ordered, ...sanitizedRest, children: orderedListContent })}
            {:else}
                <renderers.list {ordered} {...sanitizedRest}>
                    {@render orderedListContent()}
                </renderers.list>
            {/if}
        {:else}
            {#snippet unorderedListContent()}
                {@const { items: _items, ...parserRest } = sanitizedRest}
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
                            {sanitizeUrl}
                            {sanitizeAttributes}
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
                {@render listSnippet({ ordered, ...sanitizedRest, children: unorderedListContent })}
            {:else}
                <renderers.list {ordered} {...sanitizedRest}>
                    {@render unorderedListContent()}
                </renderers.list>
            {/if}
        {/if}
    {:else if type === 'html'}
        {@const { tag, ...localRest } = sanitizedRest}
        {@const htmlTag = sanitizedRest.tag as keyof typeof Html}
        {@const htmlSnippet = htmlSnippetOverrides[htmlTag as string]}
        {#if htmlSnippet}
            {#snippet htmlSnippetChildren()}
                {#if tokens && (tokens as Token[]).length}
                    <Parser
                        tokens={tokens as Token[]}
                        {renderers}
                        {snippetOverrides}
                        {htmlSnippetOverrides}
                        {sanitizeUrl}
                        {sanitizeAttributes}
                        {...Object.fromEntries(
                            Object.entries(localRest).filter(([key]) => key !== 'attributes')
                        )}
                    />
                {:else}
                    <renderers.rawtext text={sanitizedRest.raw} {...sanitizedRest} />
                {/if}
            {/snippet}
            {@render htmlSnippet({
                attributes: sanitizedRest.attributes,
                children: htmlSnippetChildren
            })}
        {:else if renderers.html && htmlTag in renderers.html}
            {@const HtmlComponent = renderers.html[htmlTag as keyof typeof renderers.html]}
            {#if HtmlComponent}
                <HtmlComponent {...sanitizedRest}>
                    {#if tokens && (tokens as Token[]).length}
                        <Parser
                            tokens={tokens as Token[]}
                            {renderers}
                            {snippetOverrides}
                            {htmlSnippetOverrides}
                            {sanitizeUrl}
                            {sanitizeAttributes}
                            {...Object.fromEntries(
                                Object.entries(localRest).filter(([key]) => key !== 'attributes')
                            )}
                        />
                    {:else}
                        <renderers.rawtext text={sanitizedRest.raw} {...sanitizedRest} />
                    {/if}
                </HtmlComponent>
            {/if}
        {:else}
            <Parser
                tokens={(tokens as Token[]) ?? ([] as Token[])}
                {renderers}
                {snippetOverrides}
                {htmlSnippetOverrides}
                {sanitizeUrl}
                {sanitizeAttributes}
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
                {@const { text: _text, raw: _raw, ...parserRest } = sanitizedRest}
                <Parser
                    {...parserRest}
                    {tokens}
                    {renderers}
                    {snippetOverrides}
                    {htmlSnippetOverrides}
                    {sanitizeUrl}
                    {sanitizeAttributes}
                />
            {:else}
                <renderers.rawtext text={sanitizedRest.raw} {...sanitizedRest} />
            {/if}
        {/snippet}

        {#if typeSnippet}
            {@render typeSnippet({ ...sanitizedRest, children: renderChildren })}
        {:else if GeneralComponent}
            <GeneralComponent {...sanitizedRest}>
                {@render renderChildren()}
            </GeneralComponent>
        {/if}
    {/if}
{/if}
