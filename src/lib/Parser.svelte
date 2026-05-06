<script module lang="ts">
    /**
     * Self-closing HTML tags that must not receive children — `<br>content</br>`
     * is invalid and `<svelte:element>` would emit it anyway. Module-scoped so
     * the Set is allocated once per module load, not once per Parser instance.
     */
    const SELF_CLOSING_HTML = new Set([
        'br',
        'hr',
        'img',
        'input',
        'link',
        'meta',
        'area',
        'base',
        'col',
        'embed',
        'keygen',
        'param',
        'source',
        'track',
        'wbr'
    ])
</script>

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
    import {
        defaultRenderers,
        type Renderers,
        type Token,
        type TokensList,
        type Tokens,
        type RendererComponent
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

    /**
     * Dev-only Parser-instance counter. Exposed via `window.__svmParserCount`
     * and `window.__svmParserByType` so the perf-bench harness can attribute
     * render cost to component allocations without a Chrome profile. The
     * `import.meta.env.DEV` guard is resolved at build time by Vite, so
     * production bundles drop this block entirely (zero overhead). Reset by
     * the perf-bench page at scenario start.
     *
     * `type` is read once at script init — Parser instances are remounted
     * (not re-keyed) when their type changes, so the initial value is the
     * effective lifetime value for counting purposes.
     */
    if (import.meta.env.DEV && typeof window !== 'undefined') {
        // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
        const w = window as any
        const initialType: string = type ?? '<root>'
        w.__svmParserCount = (w.__svmParserCount ?? 0) + 1
        const byType = (w.__svmParserByType = w.__svmParserByType ?? {})
        byType[initialType] = (byType[initialType] ?? 0) + 1
    }

    // Inline-render eligibility flags (issue #286): leaf text, space, and
    // default-renderer html tokens are by far the most common token
    // shapes. Their default render path is a no-op wrapper chain (Parser
    // → Text/RawText/HtmlComponent → `{text}` or `<tag>...</tag>`). For
    // space tokens it's even worse: Parser is instantiated, hits no
    // branch, and renders nothing. Detect once whether the user has kept
    // the default renderers / has no snippet override so we can render
    // these inline at the call site without spawning a Parser.
    const inlineTextOk = $derived(
        renderers.text === defaultRenderers.text && !snippetOverrides.text
    )
    const inlineSpaceOk = $derived(
        // No default renderer for `space`; only safe to skip when nothing
        // has been added by the user.
        !(renderers as Record<string, unknown>).space && !snippetOverrides.space
    )

    // Sanitize rest props before they reach any renderer or snippet.
    // This is the single enforcement point — custom renderers cannot bypass it.
    const sanitizedRest = $derived.by(() => {
        if ((type === 'link' || type === 'image') && typeof rest.href === 'string') {
            const tag = type === 'link' ? 'a' : 'img'
            const sanitized = sanitizeUrl(rest.href, { type, tag })
            return { ...rest, href: sanitized || undefined }
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

{#snippet dispatch(token: Token, restProps: Record<string, unknown>)}
    {@const htmlTok = token as Token & {
        tag?: string
        attributes?: Record<string, string>
        tokens?: Token[]
    }}
    {@const inlineHtmlOk =
        token.type === 'html' &&
        !!htmlTok.tag &&
        !!renderers.html &&
        renderers.html[htmlTok.tag] === Html[htmlTok.tag] &&
        !htmlSnippetOverrides[htmlTok.tag]}
    {#if token.type === 'space' && inlineSpaceOk}
        <!-- inlined: space tokens render nothing -->
    {:else if token.type === 'text' && inlineTextOk && !(token as Tokens.Text).tokens}
        {(token as Tokens.Text).text ?? token.raw}
    {:else if inlineHtmlOk && htmlTok.tag}
        {@const sanitizedAttrs = htmlTok.attributes
            ? sanitizeAttributes(
                  htmlTok.attributes,
                  { type: 'html', tag: htmlTok.tag },
                  sanitizeUrl
              )
            : undefined}
        {#if SELF_CLOSING_HTML.has(htmlTok.tag)}
            <svelte:element this={htmlTok.tag} {...sanitizedAttrs} />
        {:else}
            <svelte:element this={htmlTok.tag} {...sanitizedAttrs}>
                {#if htmlTok.tokens && htmlTok.tokens.length}
                    {#each htmlTok.tokens as childToken, i (i)}
                        {@render dispatch(childToken, restProps)}
                    {/each}
                {/if}
            </svelte:element>
        {/if}
    {:else}
        <Parser
            {...restProps}
            {...token}
            {renderers}
            {snippetOverrides}
            {htmlSnippetOverrides}
            {sanitizeUrl}
            {sanitizeAttributes}
        />
    {/if}
{/snippet}

{#if !type}
    {#if tokens}
        {@const { text: _text, raw: _raw, tokens: _tokens, ...parserRest } = rest}
        {#each tokens as token, index (index)}
            {@render dispatch(token, parserRest)}
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
                                    {#each headerItem.tokens ?? [] as headerCellToken, k (k)}
                                        {@render dispatch(headerCellToken, {})}
                                    {/each}
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
                                            {@render dispatch(cellToken, cellRest)}
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
                        {#each item.tokens ?? [] as itemToken, k (k)}
                            {@render dispatch(itemToken, parserRest)}
                        {/each}
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
                        {#each item.tokens ?? [] as itemToken, k (k)}
                            {@render dispatch(itemToken, parserRest)}
                        {/each}
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
        {@const localRestForChildren = Object.fromEntries(
            Object.entries(localRest).filter(([key]) => key !== 'attributes')
        )}
        {#if htmlSnippet}
            {#snippet htmlSnippetChildren()}
                {#if tokens && (tokens as Token[]).length}
                    {#each tokens as childToken, index (index)}
                        {@render dispatch(childToken, localRestForChildren)}
                    {/each}
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
                        {#each tokens as childToken, index (index)}
                            {@render dispatch(childToken, localRestForChildren)}
                        {/each}
                    {:else}
                        <renderers.rawtext text={sanitizedRest.raw} {...sanitizedRest} />
                    {/if}
                </HtmlComponent>
            {/if}
        {:else}
            {@const fallbackRest = Object.fromEntries(
                Object.entries(localRest).filter(([key]) => key !== 'tokens')
            )}
            {@const fallbackTokens = (tokens as Token[]) ?? ([] as Token[])}
            {#each fallbackTokens as fallbackToken, index (index)}
                {@render dispatch(fallbackToken, fallbackRest)}
            {/each}
        {/if}
    {:else}
        {@const GeneralComponent = renderers[type as keyof typeof renderers] as RendererComponent}
        {@const typeSnippet = snippetOverrides[type]}

        {#snippet renderChildren()}
            {#if tokens}
                {@const { text: _text, raw: _raw, ...parserRest } = sanitizedRest}
                {#each tokens as childToken, index (index)}
                    {@render dispatch(childToken, parserRest)}
                {/each}
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
