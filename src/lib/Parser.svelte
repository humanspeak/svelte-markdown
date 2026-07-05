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

    import {
        defaultSanitizeAttributes,
        defaultSanitizeUrl,
        type SanitizeAttributesFn,
        type SanitizeUrlFn
    } from '$lib/utils/sanitize.js'

    /**
     * Strip the structural fields SvelteMarkdown uses to select a renderer
     * (type/tokens/header/rows/ordered) and return the token's remaining
     * fields. The caller merges these with the inherited passthrough props,
     * reproducing the legacy `<Parser {...rest} {...token}>` rest bag without
     * spawning a component per token.
     */
    function tokenExtra(token: Record<string, unknown>): Record<string, unknown> {
        const {
            type: _type,
            tokens: _tokens,
            header: _header,
            rows: _rows,
            ordered: _ordered,
            ...extra
        } = token
        return extra
    }

    /**
     * Per-token URL/attribute sanitization, lifted verbatim from the former
     * component-level `$derived sanitizedRest`. Remains the single enforcement
     * point — every renderer still receives sanitized props; custom renderers
     * cannot bypass it.
     */
    function sanitizeTokenRest(
        rest: Record<string, unknown>,
        type: string,
        sanitizeUrl: SanitizeUrlFn,
        sanitizeAttributes: SanitizeAttributesFn
    ): Record<string, unknown> {
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
    }
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
     * />
     * ```
     *
     * Features:
     * - Recursive token parsing (via a self-referencing snippet, no self-import)
     * - Custom renderer support
     * - Snippet-based renderer overrides (snippet > component > default)
     * - Special handling for tables, lists, and HTML content
     * - Type-safe component rendering
     *
     * Implementation Notes:
     * - Recursion is handled by the `renderToken` snippet, which references itself.
     *   Svelte 5 explicitly supports self-referencing snippets (see the snippet
     *   scope docs). This keeps `Parser.svelte` free of a self-`import`, which
     *   previously produced a self-referential module that some bundlers
     *   (notably the Vite 8 / rolldown optimizer) could not pre-bundle.
     * - Implements special logic for tables, lists, and HTML content
     * - Handles component prop spreading carefully to avoid conflicts
     * - Maintains type safety through TypeScript interfaces
     * - HTML token handling in table cells uses type assertions for better type safety
     * - Table cell HTML content is processed with proper token nesting and attribute preservation
     * - HTML parsing maintains proper structure for both simple and complex nested elements
     *
     * @typedef {Object} Props
     * @property {Token[] | TokensList} [tokens] - Markdown tokens to be rendered
     * @property {Renderers} renderers - Component mapping for markdown elements
     * @property {Record<string, any>} [snippetOverrides] - Snippet overrides for markdown renderers
     * @property {Record<string, any>} [htmlSnippetOverrides] - Snippet overrides for HTML tag renderers
     *
     */

    import Html from '$lib/renderers/html/index.js'
    import {
        defaultRenderers,
        type Renderers,
        type Token,
        type TokensList,
        type Tokens,
        type RendererComponent
    } from '$lib/utils/markdown-parser.js'

    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    type AnySnippet = (..._args: any[]) => any

    interface Props<T extends Renderers = Renderers> {
        tokens?: Token[] | TokensList
        renderers: T
        snippetOverrides?: Record<string, AnySnippet>
        htmlSnippetOverrides?: Record<string, AnySnippet>
        sanitizeUrl?: SanitizeUrlFn
        sanitizeAttributes?: SanitizeAttributesFn
    }

    const {
        tokens = undefined,
        renderers,
        snippetOverrides = {},
        htmlSnippetOverrides = {},
        sanitizeUrl = defaultSanitizeUrl,
        sanitizeAttributes = defaultSanitizeAttributes,
        ...rest
    }: Props & {
        [key: string]: unknown
    } = $props()

    // Inline-render eligibility flags (issue #286): leaf text, space, and
    // default-renderer html tokens are by far the most common token shapes.
    // Their default render path is a no-op wrapper chain (renderToken
    // → Text/RawText/HtmlComponent → `{text}` or `<tag>...</tag>`). For
    // space tokens it's even worse: a token with no branch renders nothing.
    // Detect once whether the user has kept the default renderers / has no
    // snippet override so we can render these inline without recursing.
    const inlineTextOk = $derived(
        renderers.text === defaultRenderers.text &&
            !snippetOverrides.text &&
            // The inline path skips the leaf-text `rawtext` fallback that
            // the general-branch dispatch uses, so we must also keep the
            // optimization off when the user has provided their own
            // `rawtext` renderer or snippet — otherwise their override is
            // silently bypassed for plain text inside paragraphs/headings.
            renderers.rawtext === defaultRenderers.rawtext &&
            !snippetOverrides.rawtext
    )
    const inlineSpaceOk = $derived(
        // No default renderer for `space`; only safe to skip when nothing
        // has been added by the user.
        !(renderers as Record<string, unknown>).space && !snippetOverrides.space
    )
</script>

{#snippet renderToken(token: Token, restProps: Record<string, unknown>)}
    {@const t = token as Token & {
        header?: Tokens.TableCell[]
        rows?: Tokens.TableCell[][]
        items?: Tokens.ListItem[]
        ordered?: boolean
        tokens?: Token[]
        tag?: string
        attributes?: Record<string, string>
        href?: string
        raw?: string
        text?: string
    }}
    {@const tokenType = t.type}
    {@const sanitizedRest = sanitizeTokenRest(
        { ...restProps, ...tokenExtra(t as Record<string, unknown>) },
        tokenType,
        sanitizeUrl,
        sanitizeAttributes
    )}
    {@const inlineHtmlOk =
        tokenType === 'html' &&
        !!t.tag &&
        !!renderers.html &&
        renderers.html[t.tag] === Html[t.tag] &&
        !htmlSnippetOverrides[t.tag]}

    {#if tokenType === 'space' && inlineSpaceOk}
        <!-- inlined: space tokens render nothing -->
    {:else if tokenType === 'text' && inlineTextOk && !(t as Tokens.Text).tokens}
        {(t as Tokens.Text).text ?? t.raw}
    {:else if inlineHtmlOk && t.tag}
        {@const sanitizedAttrs = t.attributes
            ? sanitizeAttributes(t.attributes, { type: 'html', tag: t.tag }, sanitizeUrl)
            : undefined}
        {#if SELF_CLOSING_HTML.has(t.tag)}
            <svelte:element this={t.tag} {...sanitizedAttrs} />
        {:else}
            <svelte:element this={t.tag} {...sanitizedAttrs}>
                {#if t.tokens && t.tokens.length}
                    {#each t.tokens as childToken, i (i)}
                        {@render renderToken(childToken, restProps)}
                    {/each}
                {/if}
            </svelte:element>
        {/if}
    {:else if tokenType === 'table'}
        {#if renderers.table && renderers.tablerow && renderers.tablecell}
            {@const tableSnippet = snippetOverrides[tokenType]}
            {@const theadSnippet = snippetOverrides['tablehead']}
            {@const tbodySnippet = snippetOverrides['tablebody']}
            {@const rowSnippet = snippetOverrides['tablerow']}
            {@const cellSnippet = snippetOverrides['tablecell']}

            {#snippet tableContent()}
                {#if renderers.tablehead}
                    {#snippet theadContent()}
                        {#snippet headerRowContent()}
                            {#each t.header ?? [] as headerItem, i (i)}
                                {@const { align: _align, ...cellRest } = sanitizedRest}
                                {#snippet headerCellContent()}
                                    {#each headerItem.tokens ?? [] as headerCellToken, k (k)}
                                        {@render renderToken(headerCellToken, {})}
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
                        {#each t.rows ?? [] as row, i (i)}
                            {#snippet bodyRowContent()}
                                {#each row ?? [] as cells, j (j)}
                                    {@const { align: _align, ...cellRest } = sanitizedRest}
                                    {#snippet bodyCellContent()}
                                        {#each cells.tokens ?? [] as cellToken, index (index)}
                                            {@render renderToken(cellToken, cellRest)}
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
    {:else if tokenType === 'list' && renderers.list}
        {@const listSnippet = snippetOverrides['list']}

        {#if t.ordered}
            {#snippet orderedListContent()}
                {@const { items: _items, ...parserRest } = sanitizedRest}
                {@const items = (_items as Tokens.ListItem[] | undefined) ?? []}
                {#each items as item, index (index)}
                    {@const OrderedListComponent = renderers.orderedlistitem || renderers.listitem}
                    {@const orderedItemSnippet =
                        snippetOverrides['orderedlistitem'] || snippetOverrides['listitem']}
                    {#snippet orderedItemContent()}
                        {#each item.tokens ?? [] as itemToken, k (k)}
                            {@render renderToken(itemToken, parserRest)}
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
                {@render listSnippet({
                    ordered: t.ordered,
                    ...sanitizedRest,
                    children: orderedListContent
                })}
            {:else}
                <renderers.list ordered={t.ordered} {...sanitizedRest}>
                    {@render orderedListContent()}
                </renderers.list>
            {/if}
        {:else}
            {#snippet unorderedListContent()}
                {@const { items: _items, ...parserRest } = sanitizedRest}
                {@const items = (_items as Tokens.ListItem[] | undefined) ?? []}
                {#each items as item, index (index)}
                    {@const UnorderedListComponent =
                        renderers.unorderedlistitem || renderers.listitem}
                    {@const unorderedItemSnippet =
                        snippetOverrides['unorderedlistitem'] || snippetOverrides['listitem']}
                    {#snippet unorderedItemContent()}
                        {#each item.tokens ?? [] as itemToken, k (k)}
                            {@render renderToken(itemToken, parserRest)}
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
                {@render listSnippet({
                    ordered: t.ordered,
                    ...sanitizedRest,
                    children: unorderedListContent
                })}
            {:else}
                <renderers.list ordered={t.ordered} {...sanitizedRest}>
                    {@render unorderedListContent()}
                </renderers.list>
            {/if}
        {/if}
    {:else if tokenType === 'html'}
        {@const { tag, ...localRest } = sanitizedRest}
        {@const htmlTag = sanitizedRest.tag as keyof typeof Html}
        {@const htmlSnippet = htmlSnippetOverrides[htmlTag as string]}
        {@const localRestForChildren = Object.fromEntries(
            Object.entries(localRest).filter(([key]) => key !== 'attributes')
        )}
        {#if htmlSnippet}
            {#snippet htmlSnippetChildren()}
                {#if t.tokens && (t.tokens as Token[]).length}
                    {#each t.tokens as childToken, index (index)}
                        {@render renderToken(childToken, localRestForChildren)}
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
                    {#if t.tokens && (t.tokens as Token[]).length}
                        {#each t.tokens as childToken, index (index)}
                            {@render renderToken(childToken, localRestForChildren)}
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
            {@const fallbackTokens = (t.tokens as Token[]) ?? ([] as Token[])}
            {#each fallbackTokens as fallbackToken, index (index)}
                {@render renderToken(fallbackToken, fallbackRest)}
            {/each}
        {/if}
    {:else}
        {@const GeneralComponent = renderers[
            tokenType as keyof typeof renderers
        ] as RendererComponent}
        {@const typeSnippet = snippetOverrides[tokenType]}

        {#snippet renderChildren()}
            {#if t.tokens}
                {@const { text: _text, raw: _raw, ...parserRest } = sanitizedRest}
                {#each t.tokens as childToken, index (index)}
                    {@render renderToken(childToken, parserRest)}
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
{/snippet}

{#if tokens}
    {@const { text: _text, raw: _raw, ...parserRest } = rest}
    {#each tokens as token, index (index)}
        {@render renderToken(token, parserRest)}
    {/each}
{/if}
