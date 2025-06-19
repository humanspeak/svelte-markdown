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
        {#each tokens as token, index (index)}
            {@const { text: _text, raw: _raw, ...parserRest } = rest}
            <Parser {...parserRest} {...token} {renderers} />
        {/each}
    {/if}
{:else if type in renderers}
    {#if type === 'table' && renderers.table && renderers.tablerow && renderers.tablecell}
        <renderers.table {...rest}>
            {#if renderers.tablehead}
                <renderers.tablehead {...rest}>
                    <renderers.tablerow {...rest}>
                        {#each header ?? [] as headerItem, i (i)}
                            {@const { align: _align, ...cellRest } = rest}
                            <renderers.tablecell
                                header={true}
                                align={(rest.align as string[])[i]}
                                {...cellRest}
                            >
                                <Parser tokens={headerItem.tokens} {renderers} />
                            </renderers.tablecell>
                        {/each}
                    </renderers.tablerow>
                </renderers.tablehead>
            {/if}
            {#if renderers.tablebody}
                <renderers.tablebody {...rest}>
                    {#each rows ?? [] as row, i (i)}
                        <renderers.tablerow {...rest}>
                            {#each row ?? [] as cells, i (i)}
                                {@const { align: _align, ...cellRest } = rest}
                                <renderers.tablecell
                                    header={false}
                                    align={(rest.align as string[])[i]}
                                    {...cellRest}
                                >
                                    {#if cells.tokens?.[0]?.type === 'html'}
                                        {@const token = cells.tokens[0] as Token & {
                                            tag: string
                                            tokens?: Token[]
                                        }}
                                        {@const { tag, ...localRest } = token}
                                        {@const htmlTag = tag as keyof typeof Html}
                                        {#if renderers.html && htmlTag in renderers.html}
                                            {@const HtmlComponent =
                                                renderers.html[
                                                    htmlTag as keyof typeof renderers.html
                                                ]}
                                            {#if HtmlComponent}
                                                <HtmlComponent {...token}>
                                                    {#if token.tokens?.length}
                                                        <Parser
                                                            tokens={token.tokens}
                                                            {renderers}
                                                            {...Object.fromEntries(
                                                                Object.entries(localRest).filter(
                                                                    ([key]) => key !== 'attributes'
                                                                )
                                                            )}
                                                        />
                                                    {/if}
                                                </HtmlComponent>
                                            {/if}
                                        {/if}
                                    {:else}
                                        <Parser tokens={cells.tokens} {renderers} />
                                    {/if}
                                </renderers.tablecell>
                            {/each}
                        </renderers.tablerow>
                    {/each}
                </renderers.tablebody>
            {/if}
        </renderers.table>
    {:else if type === 'list' && renderers.list}
        {#if ordered}
            <renderers.list {ordered} {...rest}>
                {@const { items, ...parserRest }: {items: Props[]} = rest}
                {#each items as item, index (index)}
                    {@const OrderedListComponent = renderers.orderedlistitem || renderers.listitem}
                    {#if OrderedListComponent}
                        <OrderedListComponent {...item}>
                            <Parser {...parserRest} tokens={item.tokens} {renderers} />
                        </OrderedListComponent>
                    {/if}
                {/each}
            </renderers.list>
        {:else}
            <renderers.list {ordered} {...rest}>
                {@const { items, ...parserRest }: {items: Props[]} = rest}
                {#each items as item, index (index)}
                    {@const UnorderedListComponent =
                        renderers.unorderedlistitem || renderers.listitem}
                    {#if UnorderedListComponent}
                        <UnorderedListComponent {...item}>
                            <Parser {...parserRest} tokens={item.tokens} {renderers} />
                        </UnorderedListComponent>
                    {/if}
                {/each}
            </renderers.list>
        {/if}
    {:else if type === 'html'}
        {@const { tag, ...localRest } = rest}
        {@const htmlTag = rest.tag as keyof typeof Html}
        {#if renderers.html && htmlTag in renderers.html}
            {@const HtmlComponent = renderers.html[htmlTag as keyof typeof renderers.html]}
            {#if HtmlComponent}
                {@const tokens = (rest.tokens as Token[]) ?? ([] as Token[])}
                <HtmlComponent {...rest}>
                    {#if tokens.length}
                        <Parser
                            {tokens}
                            {renderers}
                            {...Object.fromEntries(
                                Object.entries(localRest).filter(([key]) => key !== 'attributes')
                            )}
                        />
                    {/if}
                </HtmlComponent>
            {/if}
        {:else}
            <Parser
                tokens={(rest.tokens as Token[]) ?? ([] as Token[])}
                {renderers}
                {...localRest}
            />
        {/if}
    {:else}
        {@const GeneralComponent = renderers[type as keyof typeof renderers] as RendererComponent}
        {#if GeneralComponent}
            <GeneralComponent {...rest}>
                {#if tokens}
                    {@const { text: _text, raw: _raw, ...parserRest } = rest}
                    <Parser {...parserRest} {tokens} {renderers} />
                {:else}
                    <renderers.rawtext text={rest.raw} />
                {/if}
            </GeneralComponent>
        {/if}
    {/if}
{/if}
