export { default as Slugger } from 'github-slugger'
export { Lexer, type Token, type TokensList, type Tokens } from 'marked'

import type { Component } from 'svelte'
import {
    Heading,
    Paragraph,
    Text,
    Image,
    Link,
    Em,
    Strong,
    Codespan,
    Del,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    List,
    ListItem,
    Hr,
    Html,
    Blockquote,
    Code,
    Br
} from '../renderers/index.js'

export interface Renderers {
    [key: string]: Component<any> | null // eslint-disable-line @typescript-eslint/no-explicit-any
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
