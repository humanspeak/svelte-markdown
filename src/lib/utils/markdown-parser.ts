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
    Strong,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Text
} from '../renderers/index.js'

/**
 * Type definition for markdown renderers
 * Maps each markdown element to its corresponding Svelte component
 */

export type RendererComponent = Component<any, any, any> | undefined | null // eslint-disable-line @typescript-eslint/no-explicit-any

export type Renderers = {
    // Special HTML renderer
    html: HtmlRenderers

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
    br: Br
}

export type SvelteMarkdownOptions = {
    baseUrl: string | null
    breaks: boolean
    gfm: boolean
    headerIds: boolean
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

export const defaultOptions: SvelteMarkdownOptions = {
    baseUrl: null,
    breaks: false,
    gfm: true,
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
