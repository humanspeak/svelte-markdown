/**
 * Markdown parsing utilities and default renderer configuration.
 *
 * Re-exports key symbols from `marked` and `github-slugger`, defines the
 * {@link Renderers} type and {@link defaultRenderers} map, and provides
 * the default parser options used by `SvelteMarkdown`.
 *
 * @module
 */

/** Slugger instance used to generate GitHub-style heading IDs. */
export { default as Slugger } from 'github-slugger'

/** Core `marked` exports used for lexing and type definitions. */
export { Lexer, type MarkedOptions, type Token, type Tokens, type TokensList } from 'marked'
import { type HtmlRenderers } from '$lib/renderers/html/index.js'
import type { Component } from 'svelte'

import {
    Blockquote,
    Br,
    Code,
    Codespan,
    Del,
    Em,
    Escape,
    Heading,
    Hr,
    Html,
    Image,
    Link,
    List,
    ListItem,
    Paragraph,
    RawText,
    Strong,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Text
} from '$lib/renderers/index.js'
import type { SvelteMarkdownOptions } from '$lib/types.js'

/**
 * Represents a Svelte component that can be used as a renderer.
 * Allows for flexible component types while maintaining type safety.
 *
 * @typedef {Component<any, any, any> | undefined | null} RendererComponent
 */
export type RendererComponent = Component<any, any, any> | undefined | null // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Comprehensive mapping of markdown elements to their renderer components.
 * Structured in categories for better organization and maintainability.
 *
 * Categories:
 * - HTML: Special renderer for HTML content
 * - Block elements: Major structural elements
 * - Table elements: Table-specific components
 * - Inline elements: Text-level components
 * - List variations: Specialized list item renderers
 *
 * @interface Renderers
 */
export type Renderers = {
    // Special HTML renderer
    html: HtmlRenderers

    // Raw text renderer
    rawtext: RendererComponent
    escape: RendererComponent

    // Block elements
    heading: RendererComponent
    paragraph: RendererComponent
    blockquote: RendererComponent
    code: RendererComponent
    list: RendererComponent
    listitem: RendererComponent
    hr: RendererComponent

    // Table elements
    table: RendererComponent
    tablehead: RendererComponent
    tablebody: RendererComponent
    tablerow: RendererComponent
    tablecell: RendererComponent

    // Inline elements
    text: RendererComponent
    link: RendererComponent
    image: RendererComponent
    em: RendererComponent
    strong: RendererComponent
    codespan: RendererComponent
    br: RendererComponent
    del: RendererComponent

    // List variations
    orderedlistitem: RendererComponent
    unorderedlistitem: RendererComponent
}

/**
 * Default renderer configuration mapping markdown elements to Svelte components.
 * Provides out-of-the-box rendering capabilities while allowing for customization.
 *
 * Implementation notes:
 * - All components are lazy-loaded for better performance
 * - Null values indicate optional renderers
 * - Components are type-checked against the Renderers interface
 *
 * @const {Renderers}
 */
export const defaultRenderers: Renderers = {
    heading: Heading,
    paragraph: Paragraph,
    text: Text,
    image: Image,
    link: Link,
    em: Em,
    escape: Escape,
    strong: Strong,
    codespan: Codespan,
    del: Del,
    table: Table,
    tablehead: TableHead,
    tablebody: TableBody,
    tablerow: TableRow,
    tablecell: TableCell,
    list: List,
    orderedlistitem: null,
    unorderedlistitem: null,
    listitem: ListItem,
    hr: Hr,
    html: Html,
    blockquote: Blockquote,
    code: Code,
    br: Br,
    rawtext: RawText
}

/**
 * Default configuration options for the markdown parser.
 * Provides sensible defaults while allowing for customization.
 *
 * Notable defaults:
 * - GitHub Flavored Markdown enabled
 * - Header IDs generated automatically
 * - No syntax highlighting by default
 * - HTML sanitization disabled
 * - Standard markdown parsing rules
 *
 * @const {SvelteMarkdownOptions}
 */
export const defaultOptions: SvelteMarkdownOptions = {
    async: false,
    breaks: false,
    gfm: true,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null,

    // Custom options
    headerIds: true,
    headerPrefix: ''
}
