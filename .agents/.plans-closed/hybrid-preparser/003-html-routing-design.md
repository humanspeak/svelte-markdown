# Design 003: Routing authored HTML between our renderer and compiled Svelte

Design/spike report for plan 003. Checkout `investigate/issue-372-md-preprocessor`.
Round 1 was written at `5fae1e2`. Round 2 corrections were made at `031d0ff`,
and no source changed between those commits. Read-only on source; this report
is the only file written.

**This report does not authorize implementing its proposal.** Plans 004 and 005
keep the current routing (every non-Text top-level node compiles natively) while
fixing lexical and scope bugs. A separate implementation plan must be approved
before any routing change lands.

Labels used below: **[established]** means shown by a local probe or cited code;
**[proposal]** means designed but not built or run; **[unknown]** means an open
feasibility question.

## Goals

1. **No authoring delimiters.** Authors write plain Markdown, plain HTML and plain
   Svelte. Routing is decided by the Svelte parser's own node classification, not
   by new fences, sigils or attributes.
2. **The same Markdown renderer customization for static and dynamic documents.**
   A `<section>` or `<my-widget>` in a compiled `.md` page should reach the same
   `renderers.html` entry, `html_<tag>` snippet and sanitizer hooks it would reach
   if the same text arrived as a runtime CMS string.
3. **Normal typed component props.** `<TypedCounter start={data.start} />` and
   `<UI.Card>` stay real Svelte components with live, type-checked props and
   callbacks. They do not get an `attributes: Record<string, string>` bag.
4. **No runtime Markdown lexing for compiled pages.** Tokens, including tokens
   for HTML routed to the renderer, are produced at build time and serialized
   as JSON data.
5. **Explicit sanitizer ownership.** Each route says whether `sanitizeUrl` and
   `sanitizeAttributes` apply and who owns the policy.
6. **Trusted source boundary.** Local `.md` files compiled by the preprocessor are
   application source, like `.svelte` files. The sanitizer on renderer-routed
   HTML is about consistency and customization, not about treating the author as
   hostile. Runtime CMS strings never gain executable expressions. No bundled DOM
   sanitizer (CLAUDE.md non-goal).

Non-goals: full mdsvex parity, any performance claim (nothing here was
measured), and productionizing Markdown nested inside components.

## Evidence

### Current routing and render path (file:line)

- `src/lib/preprocess/hybrid.js:61-67`: every top-level Svelte AST node except
  `Text` becomes an island. The original source slice is kept and replaced by a
  `<sm-proof-island-N />` marker. `<section>`, `<my-widget>` and `<TypedCounter>`
  are treated the same way.
- `hybrid.js:116-121`: after build-time lexing, any `html` token that is not a
  marker throws `Unsupported HTML token in the hybrid proof`. Today the token
  array cannot hold structured authored HTML at all.
- `hybrid.js:147-153`: each island becomes `{#snippet smProofIslandN()}…{/snippet}`
  and is passed to the document as `html_sm-proof-island-N={…}`.
- `src/lib/preprocess/MarkdownDocument.svelte:28-38`: the layout context config
  (`renderers`, `options`, `extensions`, `sanitizeUrl`, `sanitizeAttributes`;
  see `context.ts:12-15`) and the file's components are merged and spread into
  `<SvelteMarkdown>`.
- `src/lib/utils/component-props.ts:70-77`: `html_*` props become
  `htmlSnippetOverrides` with lowercase keys. `:20-25`: `renderers.html` keys are
  also lowercased and merged over the defaults.
- `src/lib/Parser.svelte:234-251`: `sanitizedRest` is the single enforcement
  point. For `type === 'html'`, `attributes` passes through
  `sanitizeAttributes(attrs, { type, tag }, sanitizeUrl)` before any renderer or
  snippet sees it.
- `Parser.svelte:299-317`: inline fast path. A default-renderer tag known to
  `Html` renders as `<svelte:element>` with sanitized attributes.
- `Parser.svelte:560-587`: the HTML branch. Order is `html_<tag>` snippet
  (receives `{ attributes, children }`), then `renderers.html[tag]` (receives
  `{...sanitizedRest}`: `tag`, `attributes`, `raw`, `tokens`, … plus a
  `children` snippet).
- `Parser.svelte:588-595`: **fallback for an unregistered tag renders only the
  children and drops the wrapper element.** An unregistered `<my-widget>` routed
  to the renderer would lose its element (see Open decisions).
- `src/lib/renderers/html/index.ts:106-108`: `HtmlRenderers` is
  `{ [tag]: Component | null }`. `Section.svelte` takes
  `{ children?: Snippet, attributes?: Record<string, any> }` and spreads
  `attributes` onto `<section>`. There is no `Html.svelte` file. The plan's
  placeholder resolves to this map plus the Parser HTML branch.
- `src/lib/types.ts:167-174`: `HtmlSnippetProps` is
  `{ attributes?: Record<string, string | number | boolean | undefined>, children?: Snippet }`.
- `src/lib/utils/sanitize.ts:29-33`: `SanitizeAttributesFn` is typed over
  `Record<string, string>`. `:117-142`: the default strips `on*` and `srcdoc`
  and runs URL attributes through `sanitizeUrl`.
- `src/lib/utils/token-cleanup.ts:86`: tag names are lowercased. `:693`
  `shrinkHtmlTokens` builds nested structured HTML tokens. A Marked `html`
  token holding several tags goes through htmlparser2
  (`expandHtmlBlockNested`, `:234`); opens and closes split across Marked
  tokens are paired by `pairFlatHtmlTokens` (`:503`) with the regex
  `extractAttributes` (see Probe 4).
  SvelteMarkdown does not call it for array sources; the hybrid generator does
  not call it at all.
- `src/lib/preprocess/script-block.js:36`: `collectComponentImports` is the
  string-wrapper path's regex-based import collector. It is not used by the
  hybrid path (`index.js:43-52` returns early).
- `NOTES.md:212-217` documents the current trade-off: authored HTML compiles
  natively, bypasses HTML renderer overrides and sanitizer hooks, and Markdown
  inside a compiled subtree stays text.
- `svelte.config.js:16-17`: the proof is opted in for `.mdproof` with `preparse: true`.

### Probe 1: Svelte AST classification (svelte 5.57.1, `parse(src, { modern: true })`)

In-memory probe, run from the repo root so `svelte/compiler` resolves from the
installed `node_modules`. No fixtures are written. Rerun it with:

```sh
node --input-type=module -e "
import { parse } from 'svelte/compiler';
const val = v => v === true ? 'true' : Array.isArray(v) ? v.map(p => p.type).join('+') : v.type;
const attr = a => a.type === 'Attribute' ? a.name + '=' + val(a.value) : a.type;
const show = n => n.type + (n.name ? '(' + n.name + ')' : '')
  + (n.attributes?.length ? '[' + n.attributes.map(attr).join(' ') + ']' : '')
  + (n.fragment?.nodes.length ? ' > ' + n.fragment.nodes.map(show).join(', ') : '');
for (const s of process.argv.slice(1)) console.log(s, '=>', parse(s, { modern: true }).fragment.nodes.map(show).join(' | '));
" '<section data-x="1">hi</section>' '<TypedCounter start={s} />' '<section title={t} class="a {b}" hidden></section>'
```

Pass any input from the table below as an extra argument. The `val` helper
reflects the installed modern AST: `Attribute.value` is `true` for a boolean
attribute, an **array** of `Text`/`ExpressionTag` parts for quoted or mixed
values, and a single **`ExpressionTag` object (not an array)** for a value that
is exactly one `{expression}`. Code that assumes `value` is always an array
misreads the single-expression case. Observed top-level node types (round 2
rerun on Node 24.15.0, svelte 5.57.1):

| Input                                                        | Node type and attribute shapes                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `<section data-x="1" class="a">hi</section>`                 | `RegularElement(section)`, `Attribute=Text` ×2                                                          |
| `<my-widget foo="bar" n={1}>`                                | `RegularElement(my-widget)`, `foo=Text`, `n=ExpressionTag`                                              |
| `<TypedCounter start={…} details={{…}} onchange={…} />`      | `Component(TypedCounter)`, all `Attribute=ExpressionTag`                                                |
| `<UI.Card title="t"><p>x</p></UI.Card>`                      | `Component(UI.Card)`, child `RegularElement(p)`                                                         |
| `<section title={data.t} class="a {b}" hidden>`              | `title=ExpressionTag`, `class=Text+ExpressionTag`, `hidden=true`                                        |
| `<section {...rest}>`                                        | `SpreadAttribute`                                                                                       |
| `class:on`, `bind:this`, `use:act`, `style:color`, `onclick` | `ClassDirective`, `BindDirective`, `UseDirective`, `StyleDirective`, `Attribute(onclick)=ExpressionTag` |
| `<Card>{#snippet header()}…{/snippet}body</Card>`            | `Component(Card)` > `SnippetBlock`, `Text`                                                              |
| `Text {data.greeting} more`                                  | `Text`, `ExpressionTag(MemberExpression)`, `Text`                                                       |
| `{#if}{:else}`, `{#each}`, `{#await}`, `{#key}`              | `IfBlock`, `EachBlock`, `AwaitBlock`, `KeyBlock`                                                        |
| `{@html}{@render}`; `{@const}` inside a block                | `HtmlTag`, `RenderTag`; `ConstTag` sits inside the block, not at top level (parse only)                 |
| `<svelte:element>`, `<svelte:component>`, `<svelte:head>`    | `SvelteElement`, `SvelteComponent`, `SvelteHead` (> `TitleElement`)                                     |
| `<Card>\n\n# Heading **bold** [ref][r]\n\n</Card>`           | `Component(Card)` > a single `Text` (Markdown is invisible to Svelte)                                   |
| `<Section>x</Section><DIV>y</DIV>`                           | `Component(Section)`, `Component(DIV)`: the Svelte parser classifies by case                            |
| `<svg><circle r="1"/></svg>`                                 | `RegularElement(svg)` > `RegularElement(circle)`                                                        |

**[established]** The Svelte parser already separates components (uppercase
first letter or dotted member name) from elements (lowercase, including
hyphenated custom elements). It also marks every attribute as static (`Text`
or `true`) or dynamic (`ExpressionTag`, mixed, spread or directive). A router
can read this without new syntax.

### Probe 2: build-time HTML tokens

Round 1 scripts lived in a temporary directory that has since been deleted. Round 2
reran the central cases with the self-contained script below. Save it anywhere
**outside** the repo and run it from the repo root (`node <path>/tokens.mjs`).
It uses only installed dependencies and Node's built-in type stripping (Node 24
and 26 both work). A `module.registerHooks` resolve hook retries a failing
relative `.js` import as `.ts`, because `token-cleanup.ts` imports its siblings
with `.js` specifiers.

```js
import { registerHooks, createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
registerHooks({
    resolve(spec, ctx, next) {
        try {
            return next(spec, ctx)
        } catch (e) {
            if (spec.startsWith('.') && spec.endsWith('.js'))
                return next(spec.slice(0, -3) + '.ts', ctx)
            throw e
        }
    }
})
const root = pathToFileURL(process.cwd() + '/').href
const { shrinkHtmlTokens } = await import(root + 'src/lib/utils/token-cleanup.ts')
const { preparseTokens } = await import(root + 'src/lib/preprocess/hybrid.js')
const { Marked } = await import(createRequire(root).resolve('marked'))
for (const src of CASES /* the inputs listed below */) {
    const tokens = shrinkHtmlTokens(new Marked().lexer(src))
    // print html tokens as { tag, attributes, tokens }, other tokens as { type, href? }
    // compare JSON.stringify(JSON.parse(JSON.stringify(tokens))) with JSON.stringify(tokens)
    // try { preparseTokens(src) } catch (e) { print e.message }
}
```

- `shrinkHtmlTokens(new Marked().lexer(src))` on
  `<section data-x="1" class="a">\n\nInside **md** [ref][r]\n\n</section>\n\n[r]: …`
  gave one `html` token `{ tag: 'section', attributes: { 'data-x': '1', class: 'a' } }`.
  Its `tokens` contain a real `paragraph` > `strong` and `link` with `href`
  resolved from a definition **outside** the element.
  **[established]** Document-wide refs survive when HTML stays in the Marked stream.
- `<my-widget foo="bar" onclick="evil()" href="javascript:alert(1)"></my-widget>`
  gave `{ tag: 'my-widget', attributes: { foo, onclick, href } }`. Attributes
  are raw at build time; sanitizing happens at render time in Parser.
- With markers placed inside a section, both inline (`See [ref][r] and <sm-proof-island-0 />.`)
  and block (`<sm-proof-island-1 />`) markers became nested
  `html` tokens with `tag: 'sm-proof-island-N'` inside the section's `tokens`.
  Inside a raw HTML block with no blank lines (`<section>\n<p>Hi <sm-proof-island-0 /> **x**</p>`),
  the marker also nests, and `**x**` stays text. That matches CommonMark and
  runtime behavior. (This no-blank-line case comes from round 1 and was not
  rerun. Round 2 reran the blank-line marker case above, and it reproduced.)
- `JSON.parse(JSON.stringify(tokens))` round-trips equal. **[established]** The
  nested structured tokens are serializable data.
- `preparseTokens(src)` **throws** `Unsupported HTML token in the hybrid proof`
  for every input above, and `extractSvelteIslands` turns each whole element
  into one island. This confirms the current routing.

### Probe 4: attribute literals across the parsers

Round 3 reran this probe with the runnable script below (Node 24.15.0; the
parent reproduced the same token results on Node 26). Let
`O = <section title="&#123;" alt="&amp;" q="&quot;" hidden>`. The inputs were:

- **A**: `O` alone (unclosed opening tag).
- **B**: `O + 'text</section>'` (closed, inline text, one HTML block).
- **C**: `O + '\n\ntext\n\n</section>'` (closed, blank-line separated).
- `<section title={x}>` for the dynamic case (Svelte and bare htmlparser2 only, round 2).

The token path is `shrinkHtmlTokens(new Marked().lexer(src))`. Svelte is
`parse(src, { modern: true })`, and bare htmlparser2 is `parseDocument(src)`.
B and C both parse in Svelte as one `RegularElement` whose only child is
`Text`. Both are therefore eligible slice 1 shapes.

| Source attribute | Svelte `Attribute.value` (B and C)                   | bare htmlparser2 (B and C) | token path A | token path B (nested) | token path C (flat pair) |
| ---------------- | ---------------------------------------------------- | -------------------------- | ------------ | --------------------- | ------------------------ |
| `title="&#123;"` | `[Text { raw: '&#123;', data: '{' }]` (static)       | `'{'`                      | none         | `'{'`                 | `'&#123;'`               |
| `alt="&amp;"`    | `[Text { raw: '&amp;', data: '&' }]`                 | `'&'`                      | none         | `'&'`                 | `'&amp;'`                |
| `q="&quot;"`     | `[Text { raw: '&quot;', data: '"' }]`                | `'"'`                      | none         | `'"'`                 | `'&quot;'`               |
| `hidden`         | `true`                                               | `''`                       | none         | `''`                  | `''`                     |
| `title={x}`      | `ExpressionTag` object (dynamic, not eligible for R) | `'{x}/'` (meaningless)     | n/a          | n/a                   | n/a                      |

"none" means A yields one unstructured `html` token with no `tag` or
`attributes` property.

**[established]** for these samples only:

- In source text, an unescaped `{` in an attribute value starts a Svelte
  expression, which makes the element dynamic. An entity-encoded brace
  (`&#123;`) is static text whose decoded `data` is `{`.
- Svelte's decoded `data` and bare htmlparser2 agree on all three entity
  samples. They differ on the boolean form (`true` vs `''`).
- `shrinkHtmlTokens` has two attribute paths, and the source shape picks one:
    - **B** is a single Marked `html` token containing two tags, so
      `expandHtmlToken` (`token-cleanup.ts:482-485`) sends it to
      `expandHtmlBlockNested` (`:234`). That function takes attributes from
      `htmlparser2.Parser` `onopentag` (`:272`), so entities come out
      **decoded**, matching bare htmlparser2.
    - **C** is lexed as separate opening, paragraph and closing tokens. The
      opening tag alone is not structured (`:93` returns it unchanged), and
      `pairFlatHtmlTokens` (`:503`) later pairs it with `</section>` and calls
      the regex `extractAttributes` (`:561`, defined at `:141`). Entities
      stay **undecoded**.
    - **A** has no closing tag to pair with, so it stays unstructured.
- In both B and C a boolean attribute is `''`, where Svelte has `true`.

**[unknown]** How Parser renders either string in the DOM: whether B's `'{'`
and C's `'&#123;'` produce the same attribute value as each other and as a
native compile. That needs a mount (or SSR) through Parser and was not run.
The runtime CMS path reaches the same function through
`parse-and-cache.ts:59` → `shrinkHtmlTokens`, so the same source shape gives
the same token at build time and at runtime. Across the two closed shapes,
though, the token path is not consistent with itself. Other entities,
unquoted values, whitespace inside values, other block shapes and
serialization back to HTML were not probed.

Runnable script. Save it **outside** the repo and run it from the repo root
(`node <path>/attrs.mjs`). It uses the same resolve hook as Probe 2:

```js
import { registerHooks, createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
registerHooks({
    resolve(spec, ctx, next) {
        try {
            return next(spec, ctx)
        } catch (e) {
            if (spec.startsWith('.') && spec.endsWith('.js'))
                return next(spec.slice(0, -3) + '.ts', ctx)
            throw e
        }
    }
})
const root = pathToFileURL(process.cwd() + '/').href
const req = createRequire(root)
const { shrinkHtmlTokens } = await import(root + 'src/lib/utils/token-cleanup.ts')
const { Marked } = await import(req.resolve('marked'))
const { parseDocument } = await import(req.resolve('htmlparser2'))
const sc = await import(req.resolve('svelte/compiler'))
const parse = sc.parse ?? sc.default.parse
const open = '<section title="&#123;" alt="&amp;" q="&quot;" hidden>'
const CASES = { A: open, B: open + 'text</section>', C: open + '\n\ntext\n\n</section>' }
for (const [name, src] of Object.entries(CASES)) {
    const tokens = shrinkHtmlTokens(new Marked().lexer(src))
    const show = (t) =>
        t.type === 'html'
            ? { type: t.type, tag: t.tag, attributes: t.attributes }
            : { type: t.type }
    console.log(name, JSON.stringify(tokens.map(show)))
    if (name === 'A') continue
    const el = parse(src, { modern: true }).fragment.nodes[0]
    const attrs = el.attributes.map((a) => [
        a.name,
        a.value === true ? true : a.value.map((v) => v.data)
    ])
    console.log(
        '  svelte',
        el.type,
        el.fragment.nodes.map((n) => n.type).join(','),
        JSON.stringify(Object.fromEntries(attrs))
    )
    console.log('  htmlparser2', JSON.stringify(parseDocument(src).children[0].attribs))
}
```

Round 3 output:

```text
A [{"type":"html"}]
B [{"type":"html","tag":"section","attributes":{"title":"{","alt":"&","q":"\"","hidden":""}}]
  svelte RegularElement Text {"title":["{"],"alt":["&"],"q":["\""],"hidden":true}
  htmlparser2 {"title":"{","alt":"&","q":"\"","hidden":""}
C [{"type":"html","tag":"section","attributes":{"title":"&#123;","alt":"&amp;","q":"&quot;","hidden":""}}]
  svelte RegularElement Text {"title":["{"],"alt":["&"],"q":["\""],"hidden":true}
  htmlparser2 {"title":"{","alt":"&","q":"\"","hidden":""}
```

### Probe 3: undeclared components compile silently

`compile('<Callout kind="warn">x</Callout>', { generate: 'server' })`, plus the
same for `<UI.Card />` and `<my-widget data={obj}>`: all compile with **zero
warnings**, and the output references `Callout` / `UI.Card` as free identifiers.
**[established]** A capitalized tag that the page author expects a _layout_ to
supply through `renderers.html` compiles to an unresolved reference in today's
hybrid path. Svelte gives no build-time diagnostic. Runtime failure was not
exercised (that would need a mount). Rerun from the repo root (round 2 printed
`0` three times):

```sh
node --input-type=module -e "
import { compile } from 'svelte/compiler';
for (const s of process.argv.slice(1)) console.log(s, compile(s, { generate: 'server' }).warnings.length);
" '<Callout kind="warn">x</Callout>' '<UI.Card />' '<my-widget data={obj}></my-widget>'
```

## Routing matrix

Owner key: **R** = build-time token → `SvelteMarkdown`/Parser HTML branch
(customizable). **C** = compiled Svelte inside a snippet island (trusted
application source). The **Current** column is what `5fae1e2`/`031d0ff` does.
The **Recommended** column is the **eventual target** of the proposal, not
slice 1. Rows marked [proposal] are unbuilt.

The rows use three terms for renderer-owned (R) elements:

- **Text-only static element:** a top-level `RegularElement` whose own
  attributes are all static (`value` is `true` or an array of only `Text`) and
  whose fragment holds only `Text` nodes. Markdown inside it is `Text` to
  Svelte, so `<details>\n\n**md**\n\n</details>` qualifies. Slice 1 covers
  only this subset of rows 1 and 2.
- **Nested-static:** a static element whose descendants include other static
  `RegularElement`s but nothing compiled (`<section><h2>t</h2></section>`).
  This is part of the row 1/2 target and comes in a later slice. In slice 1 it
  stays compiled.
- **Nested-compiled:** row 14, a static element with any compiled descendant.
  This is a later slice that needs nested markers. In slice 1 it stays
  compiled.

| #   | Authored syntax                                                                   | Current            | Recommended owner                                                                            | Props / children                                                                                                               | Sanitization                                                                                              |
| --- | --------------------------------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1   | Lowercase element, static attrs only (`<section data-x="1">`)                     | C (whole subtree)  | **R** [proposal; slice 1 = Text-only subset]                                                 | `attributes` bag of strings; `children` = build-time tokens, so Markdown inside follows CommonMark blank-line rules            | Runtime `sanitizeAttributes`/`sanitizeUrl` from props or layout context (Parser.svelte:234-251)           |
| 2   | Hyphenated custom element, static attrs (`<my-widget foo="bar">`)                 | C                  | **R** [proposal; slice 1 = Text-only subset]                                                 | `renderers.html['my-widget']` gets `{...sanitizedRest}` + `children`; `html_my-widget` snippet gets `{ attributes, children }` | Runtime hooks, as row 1. **Unregistered tag drops its wrapper** (Parser.svelte:588-595): open decision D2 |
| 3   | Uppercase component in script scope (`<TypedCounter start={…} />`)                | C                  | **C**                                                                                        | Normal typed props, callbacks, `$bindable`, snippets                                                                           | None from this library; Svelte escapes text/attributes; trusted source                                    |
| 4   | Member component (`<UI.Card>`)                                                    | C                  | **C** (declared-root check needs binding analysis, see Compiler integration)                 | Normal typed props                                                                                                             | None (trusted)                                                                                            |
| 5   | Uppercase tag **not** declared in page scope (`<Callout>` from a layout renderer) | C, silent free ref | **R** with lowercased key, or build error (D1) [proposal; needs binding analysis]            | Layout `renderers.html.callout` gets the string `attributes` bag. Dynamic attrs on it are a build error (cannot be typed)      | Runtime hooks                                                                                             |
| 6   | Lowercase element with any dynamic attr value (`title={x}`, `class="a {b}"`)      | C                  | **C** in slice 1 (unchanged). Later: optional attribute-bag adapter **A** (Alt. C) [unknown] | C: native element. A: `attributes` evaluated at runtime, stringified, passed to the renderer                                   | C: none (documented bypass). A: runtime hooks on evaluated values                                         |
| 7   | Lowercase element with `{...spread}`                                              | C                  | **C** (slice 1); adapter candidate later                                                     | as row 6                                                                                                                       | as row 6                                                                                                  |
| 8   | Element with directives (`bind:`, `use:`, `class:`, `style:`, `on*={fn}`)         | C                  | **C** permanently                                                                            | Directives have no meaning in a renderer component's attribute bag                                                             | None (trusted); documented bypass                                                                         |
| 9   | Component children incl. `{#snippet}`                                             | C                  | **C**                                                                                        | Svelte children/snippets. Markdown inside stays text (NOTES.md:212-214), deferred                                              | None                                                                                                      |
| 10  | Inline/standalone expression (`{data.greeting}`)                                  | C (inline island)  | **C**, may now sit _inside_ an R element as a nested marker                                  | Value rendered by Svelte (escaped)                                                                                             | Svelte text escaping only                                                                                 |
| 11  | Control flow (`{#if}`, `{#each}`, `{#await}`, `{#key}`)                           | C                  | **C** (whole block, contents included)                                                       | Contents compiled natively; Markdown inside stays text (deferred)                                                              | None                                                                                                      |
| 12  | `{@html}`, `{@render}`, `{@const}`                                                | C                  | **C**. `{@html}` is the author's explicit raw-HTML choice                                    | n/a                                                                                                                            | None; `{@html}` bypasses everything by design (trusted source)                                            |
| 13  | `svelte:*` special elements                                                       | C                  | **C**                                                                                        | n/a                                                                                                                            | None                                                                                                      |
| 14  | R element containing a C descendant (`<section><TypedCounter/></section>`)        | C (whole)          | **R outer + nested C marker** [proposal, later slice; token nesting: Probe 2]                | Outer gets the attribute bag; inner gets typed props through a nested marker snippet                                           | Outer: runtime hooks. Inner: none                                                                         |
| 15  | Markdown-generated HTML (`[x](y)`, `**b**`)                                       | R                  | R (unchanged)                                                                                | Existing renderer props                                                                                                        | Runtime hooks (unchanged)                                                                                 |
| 16  | Runtime CMS string to `<SvelteMarkdown source>`                                   | R                  | R (unchanged). No expressions ever                                                           | Existing                                                                                                                       | Runtime hooks (unchanged)                                                                                 |

## Alternatives

### Alternative A: status quo (compile all authored markup)

Every non-Text node compiles natively (`hybrid.js:61`).

- Feasibility: **[established]**. Shipped in the proof, with production SSR and
  hydration tests (plans 001/002).
- Pros: simplest. One mental model ("authored markup is Svelte"). Svelte diagnostics.
- Cons: fails goal 2. `<section>` in a `.md` page ignores `renderers.html.section`
  and sanitizer policy, but the same text from a CMS honors them. Markdown inside
  any HTML element stays text, so a common Markdown idiom
  (`<details>\n\n**md**\n\n</details>`) changes meaning compared with the
  runtime renderer. Undeclared capitalized tags compile to free references (Probe 3).

### Alternative B: Svelte-AST-classified per-node routing (recommended)

Classify each node with the Svelte AST (Probe 1). Leave static lowercase
elements in the Markdown stream as text. Extract only compiled descendants as
markers, recursively. Run `shrinkHtmlTokens` at build time so authored HTML
becomes the same structured tokens the runtime path produces.

- Feasibility: classification and nested token shapes are **[established]**
  (Probes 1-2). End-to-end rendering of nested markers through Parser, SSR,
  hydration and renderer switching is **[proposal]**, not yet run.
- Pros: meets goals 1-5 for static HTML. Typed components untouched. Static and
  dynamic documents converge on one HTML contract. Markdown inside static HTML
  and document-wide refs work (Probe 2).
- Cons: two parsers must agree on element boundaries (Svelte for
  classification, CommonMark/htmlparser2 for tokens). CommonMark HTML-block
  blank-line rules now govern Markdown inside routed elements, so
  `<section>**x**</section>` keeps `**x**` literal, the same as the runtime
  renderer. Unregistered custom elements lose their wrapper under the current
  fallback (D2). Behavior changes for existing proof pages.

### Alternative C: B plus a compiled attribute-bag adapter for dynamic HTML attributes

Rows 6 and 7 compile to a generated
`<SmHtml tag="section" attributes={{ title: data.t, ...rest }}>{children}</SmHtml>`.
`SmHtml` looks up `renderers.html[tag]` / the `html_<tag>` snippet and the
sanitizer from a context, stringifies the evaluated values, and runs
`sanitizeAttributes` reactively.

- Feasibility: **[unknown]**. It needs a renderer/sanitizer context that
  `SvelteMarkdown`/Parser does not currently publish. `MarkdownDocument` only
  sees the layout context, not props given directly to `SvelteMarkdown`.
  Children of such an element would be compiled Svelte, so Markdown inside it
  is lost unless children are also token-routed. Non-string values (objects,
  functions) do not fit `SanitizeAttributesFn`'s `Record<string, string>`
  (sanitize.ts:29-33).
- Pros: dynamic HTML attributes respect renderer and sanitizer overrides
  without touching typed components (components never take this path).
- Cons: a new runtime component and context surface. Duplicates Parser
  dispatch. Directives (row 8) still cannot route.

### Alternative D (rejected): runtime classification / re-lexing

Send authored HTML as a string for runtime htmlparser2/Marked handling. This
violates goal 4 (runtime parsing). It is listed only to rule it out.

## Recommended contract

**Default: Alternative B, staged.** Alternative C stays a later, separately
approved spike.

1. **Uppercase means compiled; lowercase means renderer.** A node the Svelte
   parser classifies as `Component` (uppercase or dotted) whose root identifier
   is declared in the page's instance or module script is compiled Svelte with
   normal typed props (rows 3, 4, 9). The "declared" check needs a binding
   analysis that does not exist yet (see Compiler integration). Until it
   exists, every `Component` stays compiled, as today. `RegularElement`, including hyphenated
   custom elements, is a renderer-owned HTML node when all its own attributes
   are static (rows 1, 2). Static HTML therefore **stays customizable** through
   `renderers.html`, `html_<tag>` snippets and the sanitizer hooks, the same
   as for CMS strings.
2. **Dynamic-attribute and directive elements stay compiled** (rows 6-8) as a
   documented trusted-source bypass, unchanged from today. Alternative C may
   later move rows 6-7 to the renderer.
3. **Expressions, blocks, tags and `svelte:*` stay compiled** (rows 10-13). When
   they sit inside a renderer-owned element, they become nested markers (row 14).
4. **Layout-registered HTML renderers vs imported components:** a capitalized
   tag _not_ declared in page scope is not compiled as a free reference. The
   recommended handling routes it to the renderer under its lowercased key,
   with static attributes only (row 5); D1 lists the alternative. Layout
   renderers therefore always receive the attribute bag (`attributes` strings +
   `children`). File-imported components always receive typed props. A name
   that is imported _and_ registered in the layout resolves to the import,
   following lexical scope.
5. **Sanitizer ownership:** renderer-owned nodes are sanitized at render time by
   whatever `sanitizeUrl`/`sanitizeAttributes` reach `SvelteMarkdown` (props or
   `setMarkdownDocumentContext`). The consumer owns that policy, and changing
   it after hydration needs no reparse. Compiled nodes have no library
   sanitizer; the page author owns them as application code. Svelte's normal
   text/attribute escaping applies. Runtime CMS strings are unchanged and never
   gain expressions. No bundled DOM sanitizer.

### Dataflow (proposed)

```text
.md source
  → frontmatter + leading scripts (unchanged)
  → maskMarkdownLiterals (unchanged; plan 004 hardens it)
  → svelte.parse(masked)                     [classification only]
  → walk fragment: for each node
        RegularElement & static attrs  → keep source text; recurse into children
                                          (slice 1: only if every child is Text)
        Component in scope / dynamic / directive / block / tag / expression
                                        → island N (source slice), replace with marker
        Component not in scope          → D1 policy (route as lowercase HTML or error);
                                          needs the separate binding analysis step,
                                          until then treated as "in scope"
  → Marked lexer (+ marker extension, build options)          [build time]
  → shrinkHtmlTokens(tokens)            [build time; htmlparser2 or flat pairing, Probe 4]
  → validate: every html token is structured (tag/attributes) or a marker
  → scriptData(tokens) → module const (JSON)
  → snippets smProofIslandN + html_sm-proof-island-N props   (unchanged mechanism)
runtime:
  MarkdownDocument → SvelteMarkdown(source = Token[]) → Parser
      html token  → html_<tag> snippet | renderers.html[tag] | default, sanitized attrs
      marker token (possibly nested) → html_sm-proof-island-N → compiled snippet
```

### Tradeoffs and migration implications

- Existing proof pages that use `<section>` or `<details>` with Markdown inside
  them change rendering: Markdown now renders, and renderer overrides now apply.
  This is the intended convergence with the runtime path, but it is
  user-visible. The hybrid fixture's `data-testid="compiled-island"` section has
  only static attributes but compiled descendants (`TypedCounter`,
  expressions, `{#if}`). It stays fully compiled under slice 1 and becomes
  renderer-owned with nested markers only under row 14. When row 14 lands, the
  browser tests from plans 001/002 that rely on it must be re-baselined.
- Default sanitization now applies to authored static HTML. An author writing
  `<a href="javascript:…">` in a trusted `.md` page loses that href unless they
  pass a permissive sanitizer. This is consistent with the runtime path; it is
  not presented as an XSS fix.
- **Nested Markdown:** improved for renderer-owned elements (real tokens,
  established). Unchanged for components and control flow: their bodies are
  still compiled Svelte text (NOTES.md:212-214), and that stays deferred.
- **Document-wide reference definitions:** preserved for everything left in the
  Marked stream, including inside routed HTML (Probe 2). Definitions _inside_ a
  compiled component body are invisible to the token tree, as they are today.
- Requires `shrinkHtmlTokens` (and htmlparser2) at build time. Both are already
  runtime dependencies, and no new dependency is needed. Whether the runtime
  bundle still needs them for compiled pages is unmeasured.
- No performance claim. Payload may grow because tokens repeat text; unmeasured.

## Compiler integration

- Classification uses only `svelte/compiler` `parse(…, { modern: true })` node
  types (`RegularElement`, `Component`, `Attribute.value` shape,
  `SpreadAttribute`, `*Directive`, blocks, tags), as observed in Probe 1. It does
  not use compiler internals or `analyze`.
- "Declared in page scope" needs **binding analysis**: resolving a component's
  root identifier against instance and module script declarations, imports
  and destructuring. No current or planned step in this batch provides it.
  Plan 005 (`005-svelte-scope.md`) only keeps authored `{#snippet}`
  declarations at generated document scope and places root-only Svelte
  metadata (`svelte:window`, `svelte:options`) at the component root. It does
  not implement general binding or import analysis and does not publish a
  resolver for component classification. Plan 005 may make island placement
  more faithful, but it is **not sufficient** for rows 4/5. **Dependency:
  scope-based `Component` routing (rows 4/5, D1) needs its own binding-analysis
  design and implementation plan beyond 005.** That plan must also decide
  between Svelte's own analysis (compiler internals, which this report avoids)
  and a separate walk of the script AST. Do not reuse the regex
  `collectComponentImports` (script-block.js:36). It misses non-import
  declarations such as `const UI = { Card }`. Slice 1 does not depend on any of
  this, because it never reclassifies a `Component`.
- Element boundaries: the island slice for a compiled node uses Svelte offsets
  (as today). The text kept for a renderer-owned element is the original source,
  re-tokenized by Marked/htmlparser2. Where the two parsers disagree on an
  element's extent (implicit closes, `<p>` auto-closing, CommonMark HTML-block
  termination at blank lines), the generator must detect it and fail the build
  with a diagnostic rather than mis-nest. **[unknown]** How often this occurs on
  real pages has not been measured.
- Attribute literals (Probe 4): an unescaped `{` in the source of an attribute
  value starts a Svelte expression, so that element is dynamic and stays
  compiled. An encoded brace (`&#123;`) is static `Text` and can be routed.
  For `&#123;`, `&amp;` and `&quot;`, Svelte's decoded `data` agrees with bare
  htmlparser2. The token path depends on source shape. A closed element in one
  HTML block (Probe 4 B) goes through htmlparser2 and gets **decoded** values.
  A blank-line-separated element (C) goes through flat pairing and
  `extractAttributes` and keeps the **raw** entity strings. Both shapes are
  Text-only to Svelte, so slice 1 would route both. In both, a boolean
  attribute becomes `''` where Svelte has `true`. Whether rendering through
  Parser gives the same attribute value as a native compile, for either shape,
  is **[unknown]**. Other entities, unquoted values, other block shapes and
  serialization are unprobed. Future tests must assert rendered DOM attribute
  values for `&#123;`, `&amp;`, `&quot;` and a boolean attribute on **both**
  closed shapes (B and C), under both native compile and the routed path.
- Markers stay inert: `tag` `sm-proof-island-N` is not in `Html`, so the Parser
  inline fast path (Parser.svelte:299-305) is skipped and the snippet override
  wins (:576-580). The hybrid.js:116-121 validator must be widened to accept
  structured HTML tokens, rejecting only unstructured `html` tokens.
- Custom build-time tokenizers (`options`) still run once, at build time (plan
  scope unchanged).

## Verification strategy

### Smallest next implementation slice (needs its own approved plan)

**Slice 1: route top-level Text-only static elements only.** This is a
deliberately conservative first step, not the whole matrix. A top-level
`RegularElement` (lowercase or hyphenated) moves to the renderer only if
**all** of these hold:

- every own attribute is static: `value === true`, or an array of only `Text`
  parts;
- it has no spread or directive;
- every node in its fragment is `Text`. Markdown inside it is `Text` to Svelte,
  so it still qualifies.

Anything else stays fully compiled, exactly as today. That includes any element
child (nested-static), any compiled descendant (nested-compiled, row 14), and
any dynamic attribute. Change only `extractSvelteIslands` classification and
`preparseTokens` (add build-time `shrinkHtmlTokens`; widen the validator).

Out of slice 1, each needing its own later approved plan:

- nested-static routing (the rest of rows 1/2);
- nested markers (row 14);
- the binding-analysis step and D1 (rows 4/5);
- Alternative C.

Slice 1 does not solve the routing matrix. It only proves the build-time-token
→ renderer → sanitizer path end to end for the simplest eligible case.

The future plan needs fixture files in its scope. These are **not** edited by
this design:

- **Fixture F1:** a new Text-only static section in
  `src/routes/test/preprocess/hybrid/+page.mdproof`, for example
  `<section data-testid="routed-static" data-x="1">` + blank line +
  `Routed **static** text with [shared][shared].` + blank line + `</section>`.
- **Fixture F2:** a `section` renderer toggle registered by
  `src/routes/test/preprocess/hybrid/+layout.svelte`, next to its existing
  heading-renderer toggle.

The existing `data-testid="compiled-island"` section (`+page.mdproof:19-25`)
contains `<h2>`, `<p>`, `TypedCounter`, expressions and `{#if}`. It is
ineligible for slice 1 and serves as a **control** that must remain compiled.

### Expected-red regression tests (should fail on `031d0ff`, pass after slice 1)

1. Vitest render: a page with a Text-only `<section data-x="1">` and a layout
   `renderers.html.section = CustomSection` renders `CustomSection`. Assert
   rendered DOM, not generated source.
2. `html_section` snippet override applies to the same authored Text-only
   `<section>`.
3. A layout `sanitizeAttributes` that strips `data-x` takes effect, and so does
   the default stripping `onclick="…"` from an authored Text-only static
   element. Replacing the sanitizer after mount updates output with zero Lexer
   calls (reuse the spy in `hybrid-render.test.ts:33`).
4. `<details>\n\n**md** [ref][r]\n\n</details>` (Text-only to Svelte) with
   `[r]` defined later renders `<strong>` and a resolved `href`.
5. Production SSR + hydration (plan 002 Playwright file, using the new
   Text-only fixture F1 and toggle F2): the custom section renderer appears in
   prerendered HTML for `routed-static` and survives a renderer toggle after
   hydration.
6. Attribute literals (Probe 4): rendered DOM attribute values for
   `title="&#123;"`, `alt="&amp;"`, `q="&quot;"` and boolean `hidden` on a
   routed Text-only element, in **both** closed source shapes: inline text in
   one HTML block (Probe 4 B, decoded token values) and blank-line-separated
   content (Probe 4 C, raw entity token values). The expected values are a
   maintainer decision (see D7). The test pins them and records any difference from native
   compile. This test is red only because routing does not exist yet. Its
   expected values must be decided, not assumed.

Each red test must fail for the intended reason. Today `preparseTokens` throws
`Unsupported HTML token in the hybrid proof`, or the element renders natively
without the custom renderer. A test that fails on a mock or import error does
not count.

### Unchanged green controls (pass on `031d0ff` and must stay green)

- C1: `<TypedCounter start={data.start} …/>` keeps number/object prop types and
  callbacks.
- C2: `<section title={x}>` (dynamic attribute) stays native and live.
- C3: the existing `compiled-island` section, which has element and compiled
  descendants, stays fully compiled. Its plan 001/002 Vitest and Playwright
  assertions (counter, callbacks, `{#if}`, load greeting) pass unchanged, and
  `renderers.html.section` does **not** apply to it in slice 1.
- C4: a nested-static element (`<section><h2>t</h2></section>`) stays compiled.
- C5: a lexer spy shows zero block/inline lexer calls on mount for the
  hybrid page, now including the routed section.

### STOP conditions for that slice

- The Svelte and CommonMark element extents disagree on any fixture, and the
  generator cannot detect it: stop and report rather than emit mis-nested tokens.
- Routing requires runtime Markdown/HTML parsing (goal 4 conflict).
- Typed component props regress (control C1 fails), or any green control
  C1-C5 turns red.
- The existing `compiled-island` section would have to change routing or be
  re-baselined for slice 1 to pass. It is a control; it is not slice 1's target.
- The fix needs changes to Parser/SvelteMarkdown public API or a new dependency.
- The unregistered custom-element fallback (D2) would silently drop markup on an
  existing fixture without a maintainer decision.
- Verification still fails after two reasonable attempts.

## Open decisions

- **D1: undeclared capitalized tags.** Options: (a) route as the lowercase
  HTML renderer key with static attributes only (recommended; it matches the
  string-wrapper path, where imported components became `renderers.html`
  entries); (b) fail the build with "not imported and not an element".
  Option (b) is stricter, but a page can then no longer use layout-registered
  capitalized renderers.
- **D2: unregistered custom elements** (`<my-widget>` with no renderer). The
  current Parser fallback drops the wrapper (Parser.svelte:588-595), while
  native compile keeps it. Options: keep library semantics (consistent with
  CMS); emit `<svelte:element>` for unknown hyphenated tags in preparsed mode
  only; or change the library-wide fallback (out of this batch, public behavior).
- **D3: dynamic attributes on lowercase elements.** Keep them native
  permanently, or pursue Alternative C. C needs a renderer/sanitizer context
  from `SvelteMarkdown`, a value-stringification policy and a children policy.
- **D4: default sanitizer on trusted authored HTML.** Apply the same defaults
  as runtime strings (recommended for consistency), or ship a preparsed-mode
  default of `unsanitizedAttributes` for authored nodes. The second option
  splits policy between the two paths.
- **D5: boundary-disagreement policy.** Build error vs. falling back to native
  compile for the whole element.
- **D6: Markdown inside components and control flow.** Remains deferred
  (NOTES.md item 1); this design neither solves nor blocks it.
- **D7: attribute literal fidelity** (Probe 4). For routed elements, decide
  whether the rendered attribute value must match native compile (Svelte
  decodes `&#123;` to `{`) or simply whatever the runtime CMS path produces.
  The runtime path is not one behavior: a closed element in one HTML block
  gets decoded values through htmlparser2, and a blank-line-separated element
  keeps raw entity strings through `extractAttributes`. For a given source
  shape, routed and runtime tokens agree. Whether the two shapes should be
  made consistent is part of this decision, and any change to
  `token-cleanup.ts` needs its own plan. The rendered DOM result of every
  option is unmeasured.

## Deferred work

- Implementing slice 1 or any routing change. This report does not authorize
  it. Plans 004 (literal masking) and 005 (scope/root placement) keep the
  current all-compiled routing.
- Nested-static routing (rest of rows 1/2) and nested markers inside routed
  HTML (row 14, nested-compiled), each as a separate later slice.
- A separate binding-analysis design and implementation plan, which rows 4/5
  and D1 need. It is not part of plan 005: 005 keeps snippet declarations and
  root metadata placement only, and must not be enlarged for this.
- The Alternative C adapter spike.
- Markdown inside components/control flow, styles, source maps, HMR, YAML,
  package entry points and identifier hygiene (batch README "Considered and
  deferred").
- Payload and performance measurement against the string wrapper and mdsvex.
  No advantage is claimed. Full mdsvex parity is not a goal.
