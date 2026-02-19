/**
 * Type definitions for the Svelte Markdown component.
 *
 * This module provides TypeScript type definitions for the core functionality
 * of the Svelte Markdown parser and renderer. It defines the primary interface
 * for component props and integrates with the marked library's token system.
 *
 * Typical usage example:
 * ```typescript
 * import type { SvelteMarkdownProps } from './types';
 *
 * const markdownProps: SvelteMarkdownProps = {
 *   source: "# Hello World",
 *   isInline: false
 * };
 * ```
 *
 * @packageDocumentation
 */

import type { MarkedExtension, Token, TokensList } from 'marked'
import type { Snippet } from 'svelte'
import type { MarkedOptions, Renderers } from './utils/markdown-parser.js'
import type { HtmlKey } from './utils/rendererKeys.js'

// --- Markdown snippet prop types ---

export interface ParagraphSnippetProps {
    children?: Snippet
}
export interface HeadingSnippetProps {
    depth: number
    raw: string
    text: string
    options: SvelteMarkdownOptions
    slug: (val: string) => string // trunk-ignore(eslint/no-unused-vars)
    children?: Snippet
}
export interface LinkSnippetProps {
    href?: string
    title?: string
    children?: Snippet
}
export interface ImageSnippetProps {
    href?: string
    title?: string
    text?: string
}
export interface CodeSnippetProps {
    lang: string
    text: string
}
export interface CodespanSnippetProps {
    raw: string
}
export interface BlockquoteSnippetProps {
    children?: Snippet
}
export interface ListSnippetProps {
    ordered?: boolean
    start?: number
    children?: Snippet
}
export interface ListItemSnippetProps {
    children?: Snippet
    listItemIndex?: number
}
export interface TableSnippetProps {
    children?: Snippet
}
export interface TableHeadSnippetProps {
    children?: Snippet
}
export interface TableBodySnippetProps {
    children?: Snippet
}
export interface TableRowSnippetProps {
    children?: Snippet
}
export interface TableCellSnippetProps {
    header: boolean
    align: 'left' | 'center' | 'right' | 'justify' | 'char' | null | undefined
    children?: Snippet
}
export interface EmSnippetProps {
    children?: Snippet
}
export interface StrongSnippetProps {
    children?: Snippet
}
export interface DelSnippetProps {
    children?: Snippet
}
export type HrSnippetProps = Record<string, never>
export type BrSnippetProps = Record<string, never>
export interface TextSnippetProps {
    children?: Snippet
}
export interface RawTextSnippetProps {
    text: string
}
export interface EscapeSnippetProps {
    text: string
}

export type SnippetOverrides = {
    paragraph?: Snippet<[ParagraphSnippetProps]>
    heading?: Snippet<[HeadingSnippetProps]>
    link?: Snippet<[LinkSnippetProps]>
    image?: Snippet<[ImageSnippetProps]>
    code?: Snippet<[CodeSnippetProps]>
    codespan?: Snippet<[CodespanSnippetProps]>
    blockquote?: Snippet<[BlockquoteSnippetProps]>
    list?: Snippet<[ListSnippetProps]>
    listitem?: Snippet<[ListItemSnippetProps]>
    orderedlistitem?: Snippet<[ListItemSnippetProps]>
    unorderedlistitem?: Snippet<[ListItemSnippetProps]>
    table?: Snippet<[TableSnippetProps]>
    tablehead?: Snippet<[TableHeadSnippetProps]>
    tablebody?: Snippet<[TableBodySnippetProps]>
    tablerow?: Snippet<[TableRowSnippetProps]>
    tablecell?: Snippet<[TableCellSnippetProps]>
    em?: Snippet<[EmSnippetProps]>
    strong?: Snippet<[StrongSnippetProps]>
    del?: Snippet<[DelSnippetProps]>
    hr?: Snippet<[HrSnippetProps]>
    br?: Snippet<[BrSnippetProps]>
    text?: Snippet<[TextSnippetProps]>
    rawtext?: Snippet<[RawTextSnippetProps]>
    escape?: Snippet<[EscapeSnippetProps]>
}

// --- HTML snippet types ---

export interface HtmlSnippetProps {
    attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    children?: Snippet
}

export type HtmlSnippetOverrides = {
    [K in HtmlKey as `html_${K}`]?: Snippet<[HtmlSnippetProps]>
}

export type SvelteMarkdownProps<T extends Renderers = Renderers> = {
    /**
     * Markdown content to render.
     *
     * Pass a `string` for raw markdown that will be parsed, or a pre-parsed
     * `Token[]` array to skip parsing entirely. An empty string renders nothing.
     */
    source: Token[] | string

    /**
     * Partial map of renderer overrides merged with the built-in defaults.
     *
     * Only the keys you provide are replaced — all others keep their default
     * component.  Use the `allowRenderersOnly` / `excludeRenderersOnly`
     * helpers to disable entire categories of renderers.
     */
    renderers?: Partial<T>

    /**
     * Options forwarded to the `marked` lexer, extended with header-ID
     * generation settings.  Merged with {@link defaultOptions}.
     */
    options?: Partial<SvelteMarkdownOptions>

    /**
     * Array of marked extensions to apply when parsing.
     *
     * Internally creates a scoped `Marked` instance, extracts its resolved
     * defaults, and merges them into the parser options so the lexer
     * recognises any custom token types the extensions define.
     *
     * Extension token names are also used to collect snippet overrides,
     * enabling both component-renderer and snippet-based rendering of
     * custom tokens.
     *
     * @defaultValue `[]`
     *
     * @example
     * ```svelte
     * <SvelteMarkdown
     *   source={markdown}
     *   extensions={[markedKatex({ throwOnError: false })]}
     *   renderers={{ inlineKatex: KatexRenderer, blockKatex: KatexRenderer }}
     * />
     * ```
     */
    extensions?: MarkedExtension[]

    /**
     * When `true`, the source is parsed with `Lexer.lexInline()` instead of
     * `Lexer.lex()`, producing only inline tokens (no block elements).
     *
     * @defaultValue `false`
     */
    isInline?: boolean

    /**
     * Callback invoked after the source has been parsed into tokens.
     *
     * Receives the full token array before rendering begins. Useful for
     * inspecting or transforming the parsed AST.
     *
     * @param tokens - The parsed token array or `TokensList`.
     */
    parsed?: (tokens: Token[] | TokensList) => void // trunk-ignore(eslint/no-unused-vars)
} & Partial<SnippetOverrides> &
    Partial<HtmlSnippetOverrides>

export interface SvelteMarkdownOptions extends MarkedOptions {
    /**
     * When `true`, an `id` attribute is generated for every heading element
     * using `github-slugger`.
     *
     * @defaultValue `true`
     */
    headerIds?: boolean

    /**
     * String prepended to every generated heading `id`.
     *
     * @defaultValue `''`
     */
    headerPrefix?: string
}
