export { default as Slugger } from 'github-slugger'
export { Lexer, type Token, type Tokens, type TokensList } from 'marked'
import type { Component } from 'svelte'
import { type HtmlRenderers } from '../renderers/html/index.js'

import {
    Blockquote,
    Br,
    Code,
    Codespan,
    Del,
    Em,
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
} from '../renderers/index.js'

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
 * Configuration options for SvelteMarkdown parser.
 * Extends marked options with additional Svelte-specific configurations.
 *
 * @interface SvelteMarkdownOptions
 *
 * @property {string|null} baseUrl - Base URL for relative links
 * @property {boolean} breaks - Enable line breaks in output
 * @property {boolean} gfm - Enable GitHub Flavored Markdown
 * @property {boolean} headerIds - Auto-generate header IDs
 * @property {string} headerPrefix - Prefix for header IDs
 * @property {Function|null} highlight - Syntax highlighting function
 * @property {string} langPrefix - Prefix for code block language classes
 * @property {boolean} mangle - Encode email addresses
 * @property {boolean} pedantic - Conform to original markdown spec
 * @property {Object|null} renderer - Custom renderer
 * @property {boolean} sanitize - Sanitize HTML input
 * @property {Function|null} sanitizer - Custom sanitizer function
 * @property {boolean} silent - Suppress error output
 * @property {boolean} smartLists - Use smarter list behavior
 * @property {boolean} smartypants - Use smart punctuation
 * @property {Object|null} tokenizer - Custom tokenizer
 * @property {boolean} xhtml - Generate XHTML-compliant tags
 */
export type SvelteMarkdownOptions = {
    baseUrl: string | null
    breaks: boolean
    gfm: boolean
    headerIds: boolean
    tables: boolean
    headerPrefix: string
    highlight: null
    langPrefix: string
    mangle: boolean
    pedantic: boolean
    renderer: null
    sanitize: boolean
    sanitizer: null
    silent: boolean
    smartLists: boolean
    smartypants: boolean
    tokenizer: null
    xhtml: boolean
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
    baseUrl: null,
    breaks: false,
    gfm: true,
    tables: true,
    headerIds: true,
    headerPrefix: '',
    highlight: null,
    langPrefix: 'language-',
    mangle: true,
    pedantic: false,
    renderer: null,
    sanitize: false,
    sanitizer: null,
    silent: false,
    smartLists: false,
    smartypants: false,
    tokenizer: null,
    xhtml: false
}
