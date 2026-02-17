/**
 * Default HTML tag renderer registry.
 *
 * Maps every supported HTML tag name (e.g. `'div'`, `'span'`) to its
 * corresponding Svelte component.  The map is used by `SvelteMarkdown`
 * when rendering raw HTML blocks embedded in markdown.
 *
 * Use the `allowHtmlOnly` / `excludeHtmlOnly` helpers (or replace
 * individual entries with `null`) to restrict which tags are rendered.
 *
 * @module
 */

import type { Component } from 'svelte'
import A from './A.svelte'
import Abbr from './Abbr.svelte'
import Address from './Address.svelte'
import Article from './Article.svelte'
import Aside from './Aside.svelte'
import Audio from './Audio.svelte'
import B from './B.svelte'
import Bdi from './Bdi.svelte'
import Bdo from './Bdo.svelte'
import Blockquote from './Blockquote.svelte'
import Br from './Br.svelte'
import Button from './Button.svelte'
import Canvas from './Canvas.svelte'
import Cite from './Cite.svelte'
import Code from './Code.svelte'
import Datalist from './Datalist.svelte'
import Dd from './Dd.svelte'
import Del from './Del.svelte'
import Details from './Details.svelte'
import Dfn from './Dfn.svelte'
import Dialog from './Dialog.svelte'
import Div from './Div.svelte'
import Dl from './Dl.svelte'
import Dt from './Dt.svelte'
import Em from './Em.svelte'
import Embed from './Embed.svelte'
import Fieldset from './Fieldset.svelte'
import Footer from './Footer.svelte'
import Form from './Form.svelte'
import H1 from './H1.svelte'
import H2 from './H2.svelte'
import H3 from './H3.svelte'
import H4 from './H4.svelte'
import H5 from './H5.svelte'
import H6 from './H6.svelte'
import Header from './Header.svelte'
import Hgroup from './Hgroup.svelte'
import Hr from './Hr.svelte'
import I from './I.svelte'
import Iframe from './Iframe.svelte'
import Img from './Img.svelte'
import Input from './Input.svelte'
import Kbd from './Kbd.svelte'
import Label from './Label.svelte'
import Legend from './Legend.svelte'
import Li from './Li.svelte'
import Main from './Main.svelte'
import Mark from './Mark.svelte'
import Menu from './Menu.svelte'
import Meter from './Meter.svelte'
import Nav from './Nav.svelte'
import Ol from './Ol.svelte'
import Optgroup from './Optgroup.svelte'
import Option from './Option.svelte'
import Output from './Output.svelte'
import P from './P.svelte'
import Param from './Param.svelte'
import Picture from './Picture.svelte'
import Pre from './Pre.svelte'
import Progress from './Progress.svelte'
import S from './S.svelte'
import Samp from './Samp.svelte'
import Section from './Section.svelte'
import Select from './Select.svelte'
import Small from './Small.svelte'
import Source from './Source.svelte'
import Span from './Span.svelte'
import Strong from './Strong.svelte'
import Sub from './Sub.svelte'
import Summary from './Summary.svelte'
import Sup from './Sup.svelte'
import Table from './Table.svelte'
import Tbody from './Tbody.svelte'
import Td from './Td.svelte'
import Textarea from './Textarea.svelte'
import Tfoot from './Tfoot.svelte'
import Th from './Th.svelte'
import Thead from './Thead.svelte'
import Tr from './Tr.svelte'
import Track from './Track.svelte'
import U from './U.svelte'
import Ul from './Ul.svelte'
import Var from './Var.svelte'
import UnsupportedHTML from './_UnsupportedHTML.svelte'

/**
 * Record type mapping HTML tag names to their Svelte renderer components.
 *
 * A `null` value means the tag is explicitly blocked and will not be
 * rendered.  This interface is used by the allow/deny filter utilities.
 */
export interface HtmlRenderers {
    [key: string]: Component<any, any, any> | null // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Default map of every supported HTML tag to its renderer component.
 *
 * Passed as the `html` key of `defaultRenderers`.  Override individual
 * entries via the `renderers.html` prop on `SvelteMarkdown`.
 */
export const Html: HtmlRenderers = {
    a: A,
    abbr: Abbr,
    address: Address,
    article: Article,
    aside: Aside,
    audio: Audio,
    b: B,
    bdi: Bdi,
    bdo: Bdo,
    blockquote: Blockquote,
    br: Br,
    button: Button,
    canvas: Canvas,
    cite: Cite,
    code: Code,
    datalist: Datalist,
    dd: Dd,
    del: Del,
    details: Details,
    dfn: Dfn,
    dialog: Dialog,
    div: Div,
    dl: Dl,
    dt: Dt,
    em: Em,
    embed: Embed,
    fieldset: Fieldset,
    footer: Footer,
    form: Form,
    h1: H1,
    h2: H2,
    h3: H3,
    h4: H4,
    h5: H5,
    h6: H6,
    header: Header,
    hgroup: Hgroup,
    hr: Hr,
    i: I,
    iframe: Iframe,
    img: Img,
    input: Input,
    kbd: Kbd,
    label: Label,
    legend: Legend,
    li: Li,
    main: Main,
    mark: Mark,
    menu: Menu,
    meter: Meter,
    nav: Nav,
    ol: Ol,
    optgroup: Optgroup,
    option: Option,
    output: Output,
    p: P,
    param: Param,
    picture: Picture,
    pre: Pre,
    progress: Progress,
    s: S,
    samp: Samp,
    section: Section,
    select: Select,
    small: Small,
    source: Source,
    span: Span,
    strong: Strong,
    sub: Sub,
    summary: Summary,
    sup: Sup,
    table: Table,
    tbody: Tbody,
    td: Td,
    textarea: Textarea,
    tfoot: Tfoot,
    th: Th,
    thead: Thead,
    tr: Tr,
    track: Track,
    u: U,
    ul: Ul,
    var: Var
}

export default Html

/**
 * Placeholder component rendered in place of HTML tags that have been
 * blocked via `excludeHtmlOnly`, `allowHtmlOnly`, or `buildUnsupportedHTML`.
 *
 * Renders the tag name and content as plain, escaped text so the user can
 * see that a tag was present but intentionally suppressed.
 */
export { UnsupportedHTML }
