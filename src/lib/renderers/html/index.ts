import type { Component } from 'svelte'
import A from './A.svelte'
import Blockquote from './Blockquote.svelte'
import Code from './Code.svelte'
import Del from './Del.svelte'
import Em from './Em.svelte'
import H1 from './H1.svelte'
import H2 from './H2.svelte'
import H3 from './H3.svelte'
import H4 from './H4.svelte'
import H5 from './H5.svelte'
import H6 from './H6.svelte'
import Hr from './Hr.svelte'
import I from './I.svelte'
import Img from './Img.svelte'
import Li from './Li.svelte'
import Ol from './Ol.svelte'
import P from './P.svelte'
import Pre from './Pre.svelte'
import Strong from './Strong.svelte'
import Sub from './Sub.svelte'
import Sup from './Sup.svelte'
import Table from './Table.svelte'
import Tbody from './Tbody.svelte'
import Td from './Td.svelte'
import Tfoot from './Tfoot.svelte'
import Th from './Th.svelte'
import Thead from './Thead.svelte'
import Tr from './Tr.svelte'
import Ul from './Ul.svelte'

export interface HtmlRenderers {
    [key: string]: Component<any, any, any> | null // eslint-disable-line @typescript-eslint/no-explicit-any
}

export const Html: HtmlRenderers = {
    a: A,
    blockquote: Blockquote,
    code: Code,
    del: Del,
    em: Em,
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    h5: H5,
    h6: H6,
    hr: Hr,
    i: I,
    img: Img,
    li: Li,
    ol: Ol,
    p: P,
    pre: Pre,
    strong: Strong,
    sub: Sub,
    sup: Sup,
    table: Table,
    tbody: Tbody,
    td: Td,
    th: Th,
    thead: Thead,
    tr: Tr,
    tfoot: Tfoot,
    ul: Ul
}

export default Html
