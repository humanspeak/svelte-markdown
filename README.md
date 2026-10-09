# @humanspeak/svelte-markdown

A powerful, customizable markdown renderer for Svelte with TypeScript support. Built as a successor to the original svelte-markdown package by Pablo Berganza, now maintained and enhanced by Humanspeak, Inc.

[![NPM version](https://img.shields.io/npm/v/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![Build Status](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml)
[![AI tokens used building this repo — TokenMaxing](https://tokenmaxing.app/badge/humanspeak/svelte-markdown)](https://tokenmaxing.app/card/humanspeak/svelte-markdown)
[![Coverage Status](https://coveralls.io/repos/github/humanspeak/svelte-markdown/badge.svg?branch=main)](https://coveralls.io/github/humanspeak/svelte-markdown?branch=main)
[![License](https://img.shields.io/npm/l/@humanspeak/svelte-markdown.svg)](https://github.com/humanspeak/svelte-markdown/blob/main/LICENSE)
[![Downloads](https://img.shields.io/npm/dm/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![CodeQL](https://github.com/humanspeak/svelte-markdown/actions/workflows/codeql.yml/badge.svg)](https://github.com/humanspeak/svelte-markdown/actions/workflows/codeql.yml)
[![Install size](https://packagephobia.com/badge?p=@humanspeak/svelte-markdown)](https://packagephobia.com/result?p=@humanspeak/svelte-markdown)
[![Code Style: Trunk](https://img.shields.io/badge/code%20style-trunk-blue.svg)](https://trunk.io)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Types](https://img.shields.io/npm/types/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/humanspeak/svelte-markdown/graphs/commit-activity)

## Features

- 🔒 HTMLParser2 parsing with default URL and attribute sanitizers (protocol allowlist, `on*` handler stripping)
- 🚀 Full markdown syntax support through Marked
- 💪 Complete TypeScript support with strict typing
- 🔄 Svelte 5 runes compatibility
- ✂️ Inline snippet overrides — customize renderers without separate files
- 🎨 Customizable component rendering system
- ♿ Semantic default markup, including image alt text and task-list checkboxes
- 🎯 GitHub-style slug generation for headers
- 🧪 Comprehensive test coverage (vitest and playwright)
- 🧩 First-class marked extensions support via `extensions` prop (e.g., KaTeX math, alerts)
- 🎨 Opt-in syntax highlighting with one `HighlightedCode` renderer and your choice of engine (Shiki or TanStack Highlight) — streaming-compatible, tree-shaken out of the core bundle
- ⚡ LRU token caching avoids repeated parsing of previously seen content
- 📡 LLM streaming with incremental parsing and token reuse (about 2–3 ms per frame on the mixed-prose benchmark below)
- 📬 Late and out-of-order packets: `writeChunk({ value, offset })` assembles chunks in any arrival order and keeps rendering while gaps fill
- 🖼️ Smart image lazy loading with fade-in animation

## Upgrading to 2.0

Version 2.0 rebuilds the streaming engine. Component props and the `writeChunk()` / `resetStream()` API are unchanged, and most apps only need the version bump. Two behaviors changed:

- Renderers for tokens **inside** list items and table cells receive only their own token fields; they no longer inherit the parent list's or table's `raw`, `text`, `items`, `header`, or `rows`.
- The default `code` renderer emits one text node per line, so `code.firstChild` is the first line only. `textContent` and `innerHTML` are unchanged.

Read the **[2.0 upgrade guide](https://markdown.svelte.page/docs/migration/v2)** for the full list, including streaming output fixes and the new `IncrementalParser` fields.

**Upgrading with an AI assistant?** Paste this so it reads the right sources first:

```text
I am upgrading @humanspeak/svelte-markdown from 1.x to 2.0 in a Svelte 5 project.
Before changing anything, read these sources:

- Upgrade guide: https://markdown.svelte.page/docs/migration/v2.md
- Documentation index for LLMs: https://markdown.svelte.page/llms.txt
- Full documentation text: https://markdown.svelte.page/llms-full.txt
- Streaming behavior: https://markdown.svelte.page/docs/advanced/llm-streaming.md
- Direct parser use: https://markdown.svelte.page/docs/advanced/headless-parser.md
- Release notes: https://github.com/humanspeak/svelte-markdown/releases

Then search my codebase for:

1. Custom renderers or snippets used inside lists and tables that read raw,
   text, items, header, or rows from props.
2. Code that reads firstChild or childNodes of rendered <code> elements or of
   the markdown container.
3. Direct IncrementalParser usage.
4. Tests that snapshot streamed output mid-stream.

List each place that needs a change, explain why using the guide, and propose
the smallest fix.
```

## Installation

Requires **Svelte 5** and **Node.js 22 or newer** for package tooling.

```bash
npm i -S @humanspeak/svelte-markdown
```

Or with your preferred package manager:

```bash
pnpm add @humanspeak/svelte-markdown
yarn add @humanspeak/svelte-markdown
```

## Basic Usage

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const source = `
# This is a header

This is a paragraph with **bold** and <em>mixed HTML</em>.

* List item with \`inline code\`
* And a [link](https://svelte.dev)
  * With nested items
  * Supporting full markdown
`
</script>

<SvelteMarkdown {source} />
```

## Rendering AI Agent Output

Modern AI coding agents — Claude Code, Codex, agentic workflows — increasingly emit HTML alongside markdown for richer output (design mockups, dashboards, reports, interactive artifacts). `@humanspeak/svelte-markdown` is built for this:

- **Mixed markdown + HTML in a single source** — agents can interleave standard markdown with rich HTML (tables, SVG, custom elements) without a second renderer
- **XSS defaults on by default** — `javascript:` URLs and `on*` handlers stripped from agent output before render, no opt-in required (see [Security](#security))
- **Sanitization during streaming** — URL and attribute sanitizers also run on progressively rendered content; partial HTML tags are buffered while they are incomplete
- **Custom HTML tag support** — route semantic markup like `<tool-call>`, `<thinking>`, or your own design-system tags to your own components via `renderers.html` (see [Custom HTML Tags](#custom-html-tags))

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { StreamingChunk } from '@humanspeak/svelte-markdown'

    let markdown: { writeChunk: (chunk: StreamingChunk) => void } | undefined

    async function streamFromAgent(response: Response) {
        if (!response.ok || !response.body) throw new Error('Streaming response unavailable')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            markdown?.writeChunk(decoder.decode(value, { stream: true }))
        }
        markdown?.writeChunk(decoder.decode())
    }
</script>

<SvelteMarkdown bind:this={markdown} source="" streaming />
```

For background on why HTML has become a common agent output format, see Thariq's post: [Using Claude Code: The Unreasonable Effectiveness of HTML](https://x.com/trq212/status/2052809885763747935). For the full streaming API (offset chunks, reset, websocket patterns), see [LLM Streaming](#llm-streaming) below.

## TypeScript Support

The package is written in TypeScript and includes full type definitions:

```typescript
import type {
    Renderers,
    Token,
    TokensList,
    SvelteMarkdownOptions,
    SvelteMarkdownProps,
    MarkedExtension
} from '@humanspeak/svelte-markdown'
```

## Exports for programmatic overrides

You can import renderer maps and helper keys to selectively override behavior.

```ts
import SvelteMarkdown, {
    // Maps
    defaultRenderers, // markdown renderer map
    Html, // HTML renderer map

    // Keys
    rendererKeys, // markdown renderer keys (excludes 'html')
    htmlRendererKeys, // HTML renderer tag names

    // Utility components
    Unsupported, // markdown-level unsupported fallback
    UnsupportedHTML // HTML-level unsupported fallback
} from '@humanspeak/svelte-markdown'

// Example: override a subset
const customRenderers = {
    ...defaultRenderers,
    link: CustomLink,
    html: {
        ...Html,
        span: CustomSpan
    }
}

// Optional: iterate keys when building overrides dynamically
for (const key of rendererKeys) {
    // if (key === 'paragraph') customRenderers.paragraph = MyParagraph
}
for (const tag of htmlRendererKeys) {
    // if (tag === 'div') customRenderers.html.div = MyDiv
}
```

Notes

- `rendererKeys` intentionally excludes `html`. Use `htmlRendererKeys` for HTML tag overrides.
- `Unsupported` and `UnsupportedHTML` display suppressed markup as escaped text. They do not remove its content; use a custom renderer if you want to hide it entirely.

## Helper utilities for allow/deny strategies

These helpers make it easy to either allow only a subset or exclude only a subset of renderers without writing huge maps by hand.

- **HTML helpers**
    - `buildUnsupportedHTML()`: returns a map where every HTML tag uses `UnsupportedHTML`.
    - `allowHtmlOnly(allowed)`: enable only the provided tags; others use `UnsupportedHTML`.
        - Accepts tag names like `'strong'` or tuples like `['div', MyDiv]` to plug in custom components.
    - `excludeHtmlOnly(excluded, overrides?)`: disable only the listed tags (mapped to `UnsupportedHTML`), with optional overrides for non-excluded tags using tuples.
- **Markdown helpers (non-HTML)**
    - `buildUnsupportedRenderers()`: returns a map where all markdown renderers (except `html`) use `Unsupported`.
    - `allowRenderersOnly(allowed)`: enable only the provided markdown renderer keys; others use `Unsupported`.
        - Accepts keys like `'paragraph'` or tuples like `['paragraph', MyParagraph]` to plug in custom components.
    - `excludeRenderersOnly(excluded, overrides?)`: disable only the listed markdown renderer keys, with optional overrides for non-excluded keys using tuples.

### HTML helpers in context

The HTML helpers return an `HtmlRenderers` map to be used inside the `html` key of the overall `renderers` map. They do not replace the entire `renderers` object by themselves.

Basic: keep markdown defaults, allow only a few HTML tags (others become `UnsupportedHTML`):

```ts
import SvelteMarkdown, { defaultRenderers, allowHtmlOnly } from '@humanspeak/svelte-markdown'

const renderers = {
    ...defaultRenderers, // keep markdown defaults
    html: allowHtmlOnly(['strong', 'em', 'a']) // restrict HTML
}
```

Allow a custom component for one tag while allowing others with defaults:

```ts
import SvelteMarkdown, { defaultRenderers, allowHtmlOnly } from '@humanspeak/svelte-markdown'

const renderers = {
    ...defaultRenderers,
    html: allowHtmlOnly([['div', MyDiv], 'a'])
}
```

Exclude just a few HTML tags; keep all other HTML tags as defaults:

```ts
import SvelteMarkdown, { defaultRenderers, excludeHtmlOnly } from '@humanspeak/svelte-markdown'

const renderers = {
    ...defaultRenderers,
    html: excludeHtmlOnly(['span', 'iframe'])
}

// Or exclude 'span', but override 'a' to CustomA
const renderersWithOverride = {
    ...defaultRenderers,
    html: excludeHtmlOnly(['span'], [['a', CustomA]])
}
```

Disable all HTML quickly (markdown defaults unchanged):

```ts
import SvelteMarkdown, { defaultRenderers, buildUnsupportedHTML } from '@humanspeak/svelte-markdown'

const renderers = {
    ...defaultRenderers,
    html: buildUnsupportedHTML()
}
```

### Markdown-only (non-HTML) scenarios

Allow only paragraph and link with defaults, disable others:

```ts
import { allowRenderersOnly } from '@humanspeak/svelte-markdown'

const md = allowRenderersOnly(['paragraph', 'link'])
```

Exclude just link; keep others as defaults:

```ts
import { excludeRenderersOnly } from '@humanspeak/svelte-markdown'

const md = excludeRenderersOnly(['link'])
```

Disable all markdown renderers (except `html`) quickly:

```ts
import { buildUnsupportedRenderers } from '@humanspeak/svelte-markdown'

const md = buildUnsupportedRenderers()
```

### Combine HTML and Markdown helpers

You can combine both maps in `renderers` for `SvelteMarkdown`.

```svelte
<script lang="ts">
    import SvelteMarkdown, { allowRenderersOnly, allowHtmlOnly } from '@humanspeak/svelte-markdown'

    const renderers = {
        // Only allow a minimal markdown set
        ...allowRenderersOnly(['paragraph', 'link']),

        // Configure HTML separately (only strong/em/a)
        html: allowHtmlOnly(['strong', 'em', 'a'])
    }

    const source = `# Title\n\nThis has <strong>HTML</strong> and [a link](https://example.com).`
</script>

<SvelteMarkdown {source} {renderers} />
```

## Custom Renderer Example

Here's a complete example of a custom renderer with TypeScript support:

```svelte
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        href?: string
        title?: string
    }

    const { href = '', title = '', children }: Props = $props()
</script>

<a {href} {title} class="custom-link">
    {@render children?.()}
</a>
```

Save this as `CustomLink.svelte`, then use it with `renderers={{ link: CustomLink }}` after importing the component. Other default implementations are in the [renderers folder](https://github.com/humanspeak/svelte-markdown/tree/main/src/lib/renderers).

## Snippet Overrides (Svelte 5)

For simple tweaks — adding a class, changing an attribute, wrapping in a div — you can override renderers inline with Svelte 5 snippets instead of creating separate component files:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const source = '# Hello\n\nA paragraph with [a link](https://example.com).'
</script>

<SvelteMarkdown {source}>
    {#snippet paragraph({ children })}
        <p class="prose">{@render children?.()}</p>
    {/snippet}

    {#snippet heading({ depth, id, children })}
        {#if depth === 1}
            <h1 {id} class="title">{@render children?.()}</h1>
        {:else}
            <svelte:element this={`h${depth}`} {id}>{@render children?.()}</svelte:element>
        {/if}
    {/snippet}

    {#snippet link({ href, title, children })}
        <a {href} {title} target="_blank" rel="noopener noreferrer">
            {@render children?.()}
        </a>
    {/snippet}

    {#snippet code({ lang, text })}
        <pre class="highlight {lang}"><code>{text}</code></pre>
    {/snippet}
</SvelteMarkdown>
```

### How it works

- **Container renderers** (paragraph, heading, blockquote, list, etc.) receive a `children` snippet for nested content
- **Leaf renderers** (code, image, hr, br) receive only data props — no `children`
- **Precedence**: snippet > component renderer > default. If both a snippet and a `renderers.paragraph` component are provided, the snippet wins

### HTML tag snippets

HTML tag snippets use an `html_` prefix to avoid collisions with markdown renderer names:

```svelte
<SvelteMarkdown {source}>
    {#snippet html_div({ attributes, children })}
        <div class="custom-wrapper" {...attributes}>{@render children?.()}</div>
    {/snippet}

    {#snippet html_a({ attributes, children })}
        <a {...attributes} target="_blank" rel="noopener noreferrer">
            {@render children?.()}
        </a>
    {/snippet}
</SvelteMarkdown>
```

All HTML snippets share the exported `HtmlSnippetProps` interface: `{ attributes?: Record<string, string | number | boolean | undefined>, children?: Snippet }`.

### Custom HTML Tags

You can render arbitrary (non-standard) HTML tags like `<click>`, `<tooltip>`, or any custom element by providing a renderer or snippet for the tag name. The parsing pipeline accepts any tag name — you just need to tell `SvelteMarkdown` how to render it.

**Component renderer approach:**

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import ClickButton from './ClickButton.svelte'

    const source = '<click>Click Me</click>'
    const renderers = { html: { click: ClickButton } }
</script>

<SvelteMarkdown {source} {renderers} />
```

**Snippet override approach:**

```svelte
<SvelteMarkdown source={'<click data-action="submit">Click Me</click>'}>
    {#snippet html_click({ attributes, children })}
        <button {...attributes} class="custom-btn">{@render children?.()}</button>
    {/snippet}
</SvelteMarkdown>
```

Both approaches work for any tag name. Snippet overrides take precedence over component renderers when both are provided.

**Self-closing and empty tags** are supported alongside the paired form, and render your component with no children:

```svelte
<SvelteMarkdown source={'<click />'} renderers={{ html: { click: ClickButton } }} />
```

**Tag names are case-insensitive**, as they are in HTML. Tags are normalized to lowercase when parsed, and renderer keys and `html_*` snippet names are normalized the same way, so `<Tooltip>`, `<TOOLTIP>` and `<tooltip>` all reach the same renderer however they are registered — and identically whether the tag stands alone or is nested inside other HTML.

One consequence worth knowing: a tag has exactly one entry, so registering the same tag under two casings is a duplicate rather than two renderers, and the last one wins. An entry you provide always takes precedence over the built-in renderer — including `null`, which blocks the tag entirely:

```svelte
<!-- blocks <iframe>, <IFRAME> and <IFrame> alike -->
<SvelteMarkdown {source} renderers={{ html: { IFRAME: null } }} />
```

The `tag` passed to custom renderers and to the `sanitizeUrl` / `sanitizeAttributes` hooks is always lowercase, so `context.tag === 'iframe'` is reliable.

## Marked Extensions

Use [marked extensions](https://marked.js.org/using_advanced#extensions) via the `extensions` prop. SvelteMarkdown ships tokenizers and renderers for KaTeX, Mermaid, GitHub-style alerts, and footnotes. Alerts and footnotes need no additional dependencies; math and diagrams require their optional peers. Use the `@humanspeak/svelte-markdown/extensions` subpath or a dedicated subpath such as `extensions/alert` or `extensions/katex`. Dedicated subpaths let you import only the feature you need. Third-party extensions still work too; the component handles registering tokenizers internally and you just provide renderers for the custom token types.

### KaTeX Math Rendering

The package includes built-in `markedKatex` and `KatexRenderer` helpers. Install `katex` as an optional peer dependency and load its CSS:

```bash
npm install katex
```

**Default delimiter set** (mirrors KaTeX's own [`auto-render`](https://katex.org/docs/autorender.html) defaults):

| Delimiter pair                                                 | Level  | `displayMode` |
| -------------------------------------------------------------- | ------ | ------------- |
| `\(...\)`                                                      | inline | `false`       |
| `\[...\]` (own-line)                                           | block  | `true`        |
| `$$...$$` (own-line)                                           | block  | `true`        |
| `\begin{equation}...\end{equation}` and other AMS environments | block  | `true`        |

Single-dollar inline (`$x^2$`) is **off** by default — KaTeX itself excludes it from auto-render to avoid currency-string clashes like `$5,000`. Pass `{ singleDollarInline: true }` to enable it; it uses a whitespace-bounded rule so currency strings still won't match.

**Component renderer approach:**

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { markedKatex, KatexRenderer } from '@humanspeak/svelte-markdown/extensions/katex'
    import 'katex/dist/katex.min.css'

    interface KatexRenderers extends Renderers {
        inlineKatex: RendererComponent
        blockKatex: RendererComponent
    }

    const renderers: Partial<KatexRenderers> = {
        inlineKatex: KatexRenderer,
        blockKatex: KatexRenderer
    }
</script>

<SvelteMarkdown
    source={`Euler's identity: \\(e^{i\\pi} + 1 = 0\\)`}
    extensions={[markedKatex()]}
    {renderers}
/>
```

`KatexRenderer` hardcodes `throwOnError: false` so a single malformed expression renders as a tinted error span instead of throwing — if you need stricter behavior, supply your own component for the `inlineKatex` / `blockKatex` keys.

**Snippet override approach** (one snippet handles inline and display math):

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import {
        markedKatex,
        KatexRenderer,
        type KatexSnippetProps
    } from '@humanspeak/svelte-markdown/extensions'
    import 'katex/dist/katex.min.css'
</script>

{#snippet math({ text, displayMode }: KatexSnippetProps)}
    <KatexRenderer {text} {displayMode} />
{/snippet}

<SvelteMarkdown
    source={`Euler's identity: \\(e^{i\\pi} + 1 = 0\\)`}
    extensions={[markedKatex()]}
    inlineKatex={math}
    blockKatex={math}
/>
```

`KatexSnippetProps` includes `text: string`, `displayMode: boolean`, and optional `streamingText: StreamingTextMetadata`. `KatexSnippetOverrides` adds optional `inlineKatex` and `blockKatex` snippets to wrapper props without accepting arbitrary prop names. Both types are exported from `@humanspeak/svelte-markdown/extensions` and `@humanspeak/svelte-markdown/extensions/katex`.

A wrapper that supplies its own KaTeX extension can forward the snippets with:

```svelte
<script lang="ts">
    import SvelteMarkdown, { type SvelteMarkdownProps } from '@humanspeak/svelte-markdown'
    import { markedKatex, type KatexSnippetOverrides } from '@humanspeak/svelte-markdown/extensions'

    type Props = Omit<SvelteMarkdownProps, 'extensions'> & KatexSnippetOverrides
    let props: Props = $props()
    const extensions = [markedKatex()]
</script>

<SvelteMarkdown {...props} {extensions} />
```

### Mermaid Diagrams (Async Rendering)

The package includes built-in `markedMermaid` and `MermaidRenderer` helpers for Mermaid diagram support. Install mermaid as an optional peer dependency:

```bash
npm install mermaid
```

Mermaid 12.0.0 pulls in Chevrotain packages that pin `lodash-es` 4.17.23,
which is affected by [CVE-2026-4800](https://github.com/advisories/GHSA-r5fr-rjxr-66jc)
and [CVE-2026-2950](https://github.com/advisories/GHSA-f23m-r3pf-42rh).
Until those upstream pins are updated, consumers using this dependency tree
should override `lodash-es` to `^4.18.1` in their application and regenerate
their lockfile. For npm, add this to the application's root `package.json`:

```json
{
    "overrides": {
        "lodash-es": "^4.18.1"
    }
}
```

For pnpm, add `overrides: { 'lodash-es@<4.18.0': '^4.18.1' }` to the application's
`pnpm-workspace.yaml`. This repository applies that override for its own tests
and docs; library overrides do not propagate to consumer applications.

Then use the built-in helpers — no boilerplate needed:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { markedMermaid, MermaidRenderer } from '@humanspeak/svelte-markdown/extensions'

    // markdown containing fenced mermaid code blocks
    let { source } = $props()

    interface MermaidRenderers extends Renderers {
        mermaid: RendererComponent
    }

    const renderers: Partial<MermaidRenderers> = {
        mermaid: MermaidRenderer
    }
</script>

<SvelteMarkdown {source} extensions={[markedMermaid()]} {renderers} />
```

`markedMermaid()` is a zero-dependency tokenizer that converts ` ```mermaid ` code blocks into custom tokens. `MermaidRenderer` lazy-loads mermaid in the browser, renders SVG asynchronously, and automatically re-renders when dark/light mode changes.

You can also use snippet overrides to wrap `MermaidRenderer` with custom markup:

```svelte
<SvelteMarkdown source={markdown} extensions={[markedMermaid()]}>
    {#snippet mermaid(props)}
        <div class="my-diagram-wrapper">
            <MermaidRenderer text={props.text} />
        </div>
    {/snippet}
</SvelteMarkdown>
```

The Mermaid tokenizer is synchronous, so parsing and streaming remain enabled. Diagram rendering happens in the browser after mount; server-rendered pages show a loading placeholder for diagrams. The snippet delegates that async rendering to `MermaidRenderer` and controls only its layout.

### GitHub Alerts

Built-in support for [GitHub-style alerts/admonitions](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts). Five alert types are supported: `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION`.

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { markedAlert, AlertRenderer } from '@humanspeak/svelte-markdown/extensions'

    const source = `
> [!NOTE]
> Useful information that users should know.

> [!WARNING]
> Urgent info that needs immediate attention.
`

    interface AlertRenderers extends Renderers {
        alert: RendererComponent
    }

    const renderers: Partial<AlertRenderers> = {
        alert: AlertRenderer
    }
</script>

<SvelteMarkdown {source} extensions={[markedAlert()]} {renderers} />
```

`AlertRenderer` renders a `<div class="markdown-alert markdown-alert-{type}">` with a title — no inline styles, so you can theme it with your own CSS. You can also use snippet overrides:

```svelte
<SvelteMarkdown source={markdown} extensions={[markedAlert()]}>
    {#snippet alert(props)}
        <div class="my-alert my-alert-{props.alertType}">
            <strong>{props.alertType}</strong>
            <p>{props.text}</p>
        </div>
    {/snippet}
</SvelteMarkdown>
```

### Footnotes

Built-in support for footnote references and definitions. Footnote references (`[^id]`) render as superscript links, and definitions (`[^id]: content`) render as a numbered list at the end of the document with back-links.

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import {
        markedFootnote,
        FootnoteRef,
        FootnoteSection
    } from '@humanspeak/svelte-markdown/extensions'

    const source = `
Here is a statement[^1] with a footnote.

Another claim[^note] that needs a source.

[^1]: This is the first footnote.
[^note]: This is a named footnote.
`

    interface FootnoteRenderers extends Renderers {
        footnoteRef: RendererComponent
        footnoteSection: RendererComponent
    }

    const renderers: Partial<FootnoteRenderers> = {
        footnoteRef: FootnoteRef,
        footnoteSection: FootnoteSection
    }
</script>

<SvelteMarkdown {source} extensions={[markedFootnote()]} {renderers} />
```

Definitions may start with zero to three spaces. Continuation text must be indented by at least four spaces or one tab; one indentation unit is removed from the rendered plain text. A blank line belongs to a definition only when an indented continuation follows it, so an unindented paragraph, heading, list, fence, or HTML block after a definition remains normal document content. Empty definition bodies are supported. If a label is defined more than once, the first definition in document order wins.

`FootnoteRef` renders `<sup><a href="#fn-{id}">{id}</a></sup>` and `FootnoteSection` renders an `<ol>` with bidirectional links. Simple labels containing only ASCII letters, digits, `_`, and `-` retain the legacy IDs (`fn-my-note` and `fnref-my-note`). Other UTF-16 code units use a deterministic `~` plus four-digit lowercase hexadecimal encoding: for example, `[^x:2]` uses `fn-x~003a2`. Repeated references retain their visible label while receiving occurrence IDs such as `fnref-note`, `fnref-note:ref:2`, and `fnref-note:ref:3`; the definition renders one backlink for each occurrence. Link fragments URI-encode these full DOM IDs.

Custom component renderers and snippet overrides receive additive navigation props. A `footnoteRef` receives `{ id, referenceId? }`, where `referenceId` is the prepared occurrence DOM ID. A `footnoteSection` receives `{ footnotes }`, with each record shaped as `{ id, text, backrefs?: string[] }`; `backrefs` contains the prepared reference DOM IDs. The built-in renderers keep their legacy first-reference fallback when these optional props are omitted.

IDs are coordinated within one `SvelteMarkdown` document. Separate component instances using the same labels are not automatically namespaced, so applications that place multiple rendered documents in one page should provide custom renderers if cross-document ID uniqueness is required. Footnote bodies are rendered as escaped plain text rather than Markdown, and this extension does not claim full CommonMark or GFM footnote compatibility.

### Syntax Highlighting (Shiki or TanStack Highlight)

Unlike the marked extensions above, syntax highlighting is a **renderer-level override**: you replace the default `code` renderer with `HighlightedCode`, so there is **no `extensions` prop entry** and **no marked tokenizer** involved. `HighlightedCode` is engine-agnostic — it talks to a two-method `CodeHighlighter` interface, and two engines ship as opt-in factories on their own subpaths. Both are synchronous, so the `code` renderer never trips the async-extension guard — **streaming stays fully enabled**.

| Subpath                                                     | Exports                                                                                  | Optional peer         | Core + `ts`/`js`/`json` |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------- | ----------------------- |
| `@humanspeak/svelte-markdown/extensions/highlight`          | `HighlightedCode`, `CodeHighlighter`, `HIGHLIGHT_CONTEXT_KEY`, `setCodeHighlighter`      | none                  | —                       |
| `@humanspeak/svelte-markdown/extensions/shiki`              | `createShikiHighlighter` — TextMate grammars, inline theme colors                        | `shiki`               | ~87 KB gzip             |
| `@humanspeak/svelte-markdown/extensions/tanstack-highlight` | `createTanstackHighlighter` — hand-written scanners, semantic `th-*` classes, CSS themes | `@tanstack/highlight` | ~4 KB gzip              |

The TanStack adapter supports Highlight 0.1 and 1.x. Upgrading to 1.0 requires no changes to imports, factory options, or theme setup; JavaScript and TypeScript property names that are keywords may receive corrected colors.

Pick Shiki for editor-exact colors and 200+ grammars; pick TanStack Highlight for chat and agent UIs that stream a lot of code and care about weight (25 languages, themes are CSS variables so light/dark is a CSS toggle). Install the peer you use:

```bash
npm install shiki                # or
npm install @tanstack/highlight
```

Import only the languages (and, for Shiki, themes) you need, build a highlighter, register it, then map `HighlightedCode` to the `code` renderer:

````svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import {
        createTanstackHighlighter,
        HighlightedCode,
        setCodeHighlighter
    } from '@humanspeak/svelte-markdown/extensions/tanstack-highlight'
    import { ts } from '@tanstack/highlight/languages/ts'
    import { createThemeCss } from '@tanstack/highlight/theme'
    import githubDark from '@tanstack/highlight/themes/github-dark'
    import githubLight from '@tanstack/highlight/themes/github-light'

    // Register once (module singleton). Every HighlightedCode instance resolves it.
    setCodeHighlighter(createTanstackHighlighter({ languages: [ts] }))
    // TanStack emits classes only — ship a theme stylesheet (match darkSelector to your app).
    const themeCss = createThemeCss({
        light: githubLight,
        dark: githubDark,
        darkSelector: 'html.dark'
    })

    const source = '```ts\nconst answer: number = 42\n```'
</script>

<svelte:head>{@html `<style>${themeCss}</style>`}</svelte:head>
<SvelteMarkdown {source} renderers={{ code: HighlightedCode }} />
````

The Shiki variant is the same shape: `createShikiHighlighter({ langs: [ts], themes: [githubDark] })` from `extensions/shiki` with `shiki/langs/*` and `shiki/themes/*` imports, and no stylesheet since colors are inlined.

The highlighter is resolved in priority order: an explicit `highlighter` prop → a Svelte context set under `HIGHLIGHT_CONTEXT_KEY` (for per-subtree engines/themes or SSR request isolation) → the module singleton from `setCodeHighlighter`. Unregistered languages and any per-block failure degrade to an **escaped** fallback `<pre>` rather than throwing mid-stream (Shiki: `shiki-fallback`; TanStack: its own `th-code--plaintext` so the block keeps your theme, or `th-code--fallback` with `plaintextFallback: false`). Both engines escape the code they emit and every fallback escapes its inputs, so the `{@html}` sink only ever receives library-generated or explicitly-escaped markup (the same trust model as `KatexRenderer` / `MermaidRenderer`). You can also implement `CodeHighlighter` yourself to wrap any other highlighter.

**Backward compatibility.** `extensions/shiki` still exports `ShikiCode`, `SHIKI_CONTEXT_KEY`, `setShikiHighlighter`, `getShikiHighlighter`, and `ShikiHighlighter`; they are aliases of the `extensions/highlight` names (same component, same symbol, same singleton). The only visible change is that with **no highlighter configured at all** the renderer's fallback `<pre>` carries `highlight-fallback` instead of `shiki-fallback`.

**Bundle guidance — this is opt-in for a reason.** The cost lands **only** when you construct a highlighter: importing `HighlightedCode` alone pulls in nothing from either engine, the core `SvelteMarkdown` bundle stays engine-free, and the two engines never leak into each other (all enforced by `scripts/tree-shaking.mjs`). Import narrowly: every extra grammar, language, or theme you import is bundled. Shiki's JS engine keeps SSR trivial (no WASM); highlight-heavy client apps can opt into its faster oniguruma-WASM engine, which is still streaming-safe. See the [side-by-side streaming demo](https://markdown.svelte.page/examples/highlight-engines) for live per-engine timings.

### How It Works

Marked extensions define custom token types with a `name` property (e.g., `inlineKatex`, `blockKatex`, `alert`). When you pass extensions via the `extensions` prop, SvelteMarkdown automatically extracts these token type names and makes them available as both **component renderer keys** and **snippet override names**.

To find the token type names for any extension, check its source or documentation for the `name` field in its `extensions` array:

```js
// Example: markedKatex (built-in) registers tokens named "inlineKatex" and "blockKatex"
// → use renderers={{ inlineKatex: ..., blockKatex: ... }}
// → or {#snippet inlineKatex(props)} and {#snippet blockKatex(props)}

// Example: a custom alert extension registers a token named "alert"
// → use renderers={{ alert: AlertComponent }}
// → or {#snippet alert(props)}
```

Each snippet/component receives the token's properties as props (e.g., `text`, `displayMode` for KaTeX; `text`, `alertType` for alerts). Marked HTML renderer functions do not replace Svelte renderers; provide a component or snippet for each custom token type.

### Dynamic Extension Objects

SvelteMarkdown includes extension identity in its internal parser cache. If you replace an extension object, tokenizer object, or tokenizer function, the parser treats that as a new parsing configuration and re-parses the source.

This means extension factories can safely close over reactive state:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { MarkedExtension } from 'marked'

    let displayFormat = $state<'decimal' | 'percent'>('decimal')

    const makeDisplayExtension = (format: 'decimal' | 'percent'): MarkedExtension => ({
        extensions: [
            {
                name: 'displayValue',
                level: 'inline',
                tokenizer(src) {
                    const match = /^\((\d+)\)/.exec(src)
                    if (!match) return

                    return {
                        type: 'displayValue',
                        raw: match[0],
                        text: match[1],
                        displayFormat: format
                    }
                }
            }
        ]
    })

    const extensions = $derived([makeDisplayExtension(displayFormat)])
</script>

<SvelteMarkdown source="(42)" {extensions}>
    {#snippet displayValue(props)}
        <span data-format={props.displayFormat}>{props.text}</span>
    {/snippet}
</SvelteMarkdown>
```

When `displayFormat` changes from `decimal` to `percent`, the new extension object invalidates the cached parse even though the markdown source is unchanged. The updated token props flow into your renderer or snippet without requiring a manual cache key.

See the [full documentation](https://markdown.svelte.page/docs/advanced/marked-extensions) and [interactive demo](https://markdown.svelte.page/examples/marked-extensions).

### TypeScript

All snippet prop types are exported for use in external components:

```typescript
import type {
    ParagraphSnippetProps,
    HeadingSnippetProps,
    LinkSnippetProps,
    CodeSnippetProps,
    HtmlSnippetProps,
    SnippetOverrides,
    HtmlSnippetOverrides
} from '@humanspeak/svelte-markdown'
```

## Advanced Features

### Table Support with Mixed Content

The package excels at handling complex nested structures and mixed content:

```markdown
| Type       | Content                                 |
| ---------- | --------------------------------------- |
| Nested     | <div>**bold** and _italic_</div>        |
| Mixed List | <ul><li>Item 1</li><li>Item 2</li></ul> |
| Code       | <code>`inline code`</code>              |
```

### HTML in Markdown

Seamlessly mix HTML and Markdown:

```markdown
<div style="color: blue">
  ### This is a Markdown heading inside HTML
  And here's some **bold** text too!
</div>

<details>
<summary>Click to expand</summary>

- This is a markdown list
- Inside an HTML details element
- Supporting **bold** and _italic_ text

</details>
```

### Markdown preprocessor (alpha)

We’re developing a Markdown preprocessor for authored pages and components.
It parses Markdown at build time while preserving `SvelteMarkdown`’s custom
Markdown renderers, and compiles embedded Svelte components and expressions without
requiring special delimiters. Static pages can use the same renderer
customization as runtime Markdown, without parsing the document again in the
browser.

**Status: alpha.** The API and supported syntax are still evolving. This alpha
does not yet provide a published preprocessor entry point.

## Performance

### Intelligent Token Caching

Parsed tokens are automatically cached using an LRU strategy, avoiding repeated lexing for previously seen content. The benefit depends on document size and parsing configuration. The cache uses FNV-1a hashing keyed on source + options, with LRU eviction (default 50 documents) and TTL expiration (default 5 minutes). No configuration required.

```typescript
import { tokenCache, TokenCache } from '@humanspeak/svelte-markdown'

// Manual cache management
tokenCache.clearAllTokens()
tokenCache.deleteTokens(markdown, options)

// Custom cache instance
const myCache = new TokenCache({ maxSize: 100, ttl: 10 * 60 * 1000 })
```

`tokenCache` is the shared cache used by the component. Creating a separate
`TokenCache` does not replace it; a custom instance is for your own token caching.
Treat cache option objects as immutable and create a new object when options change.

> Cache entries store the source string alongside its
> tokens so a hit is verified against hash collisions — `getTokens`,
> `setTokens`, and `hasTokens` are the supported token API. The raw
> `get()`/`set()` methods inherited from `MemoryCache` now operate on the
> wrapped `{ source, tokens }` entry shape, not bare token arrays.

### Smart Image Lazy Loading

The default Markdown `image` renderer lazy loads using native `loading="lazy"` and IntersectionObserver prefetching, with a smooth fade-in animation and error state handling. When an image URL changes, its load/error state resets for the new request; unchanged image URLs keep their existing DOM and completed state during updates. Reusing the same failed URL does not automatically retry it. Raw HTML `<img>` tags use the HTML renderer and do not inherit this behavior. To disable lazy loading or provide custom retry behavior for Markdown images, provide a custom image renderer:

```svelte
<!-- EagerImage.svelte -->
<script lang="ts">
    let { href = '', title = undefined, text = '' } = $props()
</script>

<img src={href} {title} alt={text} loading="eager" />
```

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import EagerImage from './EagerImage.svelte'

    const renderers = { image: EagerImage }
</script>

<SvelteMarkdown source={markdown} {renderers} />
```

### Optional streaming text segments and Motion

Default rendering remains ordinary unwrapped text. `streamingText` (default `false`) enables immutable source arrival metadata only with synchronous `streaming`; animation requires an explicitly selected renderer or snippet.

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { FadeWords } from '@humanspeak/svelte-markdown/streaming/motion'
    let source = $state('')
    let streamId = $state(0)
</script>

<SvelteMarkdown {source} {streamId} streaming streamingText renderers={{ rawtext: FadeWords }} />
```

Install `@humanspeak/svelte-motion@^2.0.1-0` explicitly for the optional `streaming/motion` subpath. It exports `FadeWords` (opacity), `RiseWords` (opacity plus vertical rise), `FadeCharacters` (graphemes), `Fade` (a whole extension token such as math), `StreamingMotionProps` and `StreamingFadeProps`. Motion is an optional peer; installing it alone enables nothing. Presets accept `enabled`, `ink`, `animateRevisions`, `animateInitialContent`, `initial`, `animate`, `transition`, `variants`, `custom`, `locale`, `segmenter` and a complete markup replacement `segment` snippet. Whitespace stays literal; RiseWords motion spans and ink-wipe wrappers are inline-block. Consumers control reduced motion via `enabled`.

All three presets use a leaf-local batch stagger of 0.02s capped at 0.16s. FadeWords fades over 0.65s (linear). RiseWords adds an 8px rise over 0.4s (`easeOut`) to the same fade. FadeCharacters keeps a 0.18s fade. FadeWords and RiseWords also apply an ink wipe, a feathered left-to-right mask reveal over 0.8s on arriving words; pass `ink={false}` to disable it or `ink={{ duration }}` to retime it (FadeCharacters leaves it off unless `ink` is passed). Consumer `initial` and `animate` replace the preset targets; `transition` replaces the entire default transition, including easing and stagger.

The core exports headless `StreamingText` with `text`, optional `metadata`, `granularity: 'word' | 'grapheme'` (word by default), `locale`, `segmenter`, and `segment: Snippet<[StreamingTextSegment]>`. Forward leaf/snippet `streamingText` into `metadata`. Without a snippet it emits escaped text without wrappers or segmentation. No Motion installation is required for core or headless use.

`StreamingTextSegment` has readonly `id`, `text`, `index`, `start`, `end`, `isNew`, `batchId`, `batchIndex`, `isWhitespace` and `change: 'baseline' | 'append' | 'revision'`. Offsets are leaf-local UTF-16. Creation eligibility and batch fields persist while an unfinished word grows. `StreamingTextMetadata` has readonly `epoch`, `leafId`, `renderBatchId`, `provenance: 'exact' | 'unknown'`, readonly `ranges` and, on extension tokens only, `arrival` (`StreamingTextArrival`: `change`, `batchId`, `revealedBeforeBatch`). Each `StreamingTextRange` has readonly `start`, `end`, `originId`, `change`, `batchId` and `revealedBeforeBatch`. Other exported types are `StreamingTextArrival`, `StreamingTextProps`, `StreamingTextSpan`, `StreamingTextSegmenter`, `StreamingTextGranularity` and `StreamingTextChange`.

First/reset content is baseline; appends are arrivals; offset overwrites are revisions. Structural remounts do not replay already revealed source characters. Tokens produced by custom extension tokenizers (for example KaTeX math) have unknown provenance and no word segments; surrounding markdown text keeps its entrances. Wrap their renderer in `Fade` (`<Fade {streamingText}><KatexRenderer {text} /></Fade>`, `block` for display math) to fade the whole token in once, when it arrives; remounts of already revealed tokens and baseline content render without an entrance. `Fade` accepts `streamingText`, `enabled`, `block`, `animateRevisions`, `animateInitialContent`, `initial`, `animate` and `transition`. A `walkTokens` hook or custom `tokenizer` makes the whole parse unknown and suppresses automatic entrances. Tracking is per instance and discarded on resets, replacements, mode changes and toggles. Unicode boundaries require `Intl.Segmenter` or validated custom spans covering the exact text; locale/segmentation changes rebaseline. Changed leaves are resegmented with full context; completed unchanged leaves stay cached. Segment DOM cost is opt-in, and long open blocks/full-parser fallbacks retain their existing costs. Code renderers are excluded.

See the [streaming text API and complete prop/imperative, custom snippet, SSR and reduced-motion examples](https://markdown.svelte.page/docs/advanced/llm-streaming#optional-text-arrival-effects) and [executable demo with actual source](https://markdown.svelte.page/examples/streaming-text-motion).

### LLM Streaming

For real-time rendering of AI responses, enable the `streaming` prop. Append-only updates normally re-parse the open block at the end of the source and reuse unchanged tokens. Edits, reference definitions, and some extensions can require a full-document parse; work is not constant for every document or configuration.

The preferred API is now imperative: bind the component instance and call `writeChunk()` as chunks arrive. This avoids prop reactivity edge cases like identical consecutive string chunks being coalesced.

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { StreamingChunk } from '@humanspeak/svelte-markdown'

    let markdown:
        | {
              writeChunk: (chunk: StreamingChunk) => void
              resetStream: (nextSource?: string) => void
          }
        | undefined

    async function streamResponse() {
        const response = await fetch('/api/chat', { method: 'POST', body: '...' })
        if (!response.ok || !response.body) throw new Error('Streaming response unavailable')
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            markdown?.writeChunk(decoder.decode(value, { stream: true }))
        }
        markdown?.writeChunk(decoder.decode())
    }
</script>

<SvelteMarkdown bind:this={markdown} source="" streaming={true} />
```

For websocket-style offset patches, pass an object chunk instead:

```ts
markdown?.writeChunk({ value: 'world', offset: 6 })
```

Object chunks overwrite the internal buffer at `offset`. This is overwrite semantics, not insert semantics: the chunk replaces characters starting at that index and preserves any trailing content after the overwritten span.

Offsets count JavaScript string positions (UTF-16 code units), not bytes. If `offset` skips ahead, missing positions are padded with spaces. A chunk that opens a gap larger than 1,000,000 positions is dropped with a warning. There is no delete or truncate behavior in offset mode.

Typical websocket-style usage can arrive out of order:

```ts
markdown?.writeChunk({ value: ' world', offset: 5 })
markdown?.writeChunk({ value: 'Hello', offset: 0 })
```

The internal buffer converges as later patches fill earlier gaps.

You can reset the internal streaming buffer at any time:

```ts
markdown?.resetStream('')
markdown?.resetStream('# Seeded response')
```

The first successful write after a reset locks the stream into one input mode:

- `string` chunks: append mode
- `{ value, offset }` chunks: offset mode

Switching modes before `resetStream()` or a `source` prop reset logs a warning and drops the chunk. Offset chunks must use a non-negative safe integer `offset`.

Setting the `source` prop to a **new value** also resets the imperative buffer, seeds a new baseline value, and unlocks the input mode. Re-assigning the same value is not a change and resets nothing — see the warning below.

#### Resetting between messages

The streaming buffer, the incremental parser, and the input-mode lock are all **per-component-instance** state. They outlive any single message. If a component instance is reused for a second stream without being reset, the new stream starts on top of the previous message's buffer.

This bites the common chat-transcript pattern, because Svelte reuses the component instance whenever it isn't keyed by message identity:

```svelte
<!-- ⚠️ Broken: one recycled instance, no reset between messages -->
{#each messages as message}
    <SvelteMarkdown bind:this={markdown} source="" streaming={true} />
{/each}
```

Holding `source=""` for the entire conversation means the `source` prop never changes, so nothing ever triggers the implicit reset. Concretely:

- **append mode** — the next message renders as `previous message + new message`.
- **offset mode** — writes overwrite in place without truncating, so the previous message's **tail** survives past the end of the new one. This does not self-correct until the new message grows longer than the old one.
- **either mode** — the input-mode lock from the previous stream is still in force, so the first chunk of the new stream is dropped with a warning if it uses the other chunk type.

Pass a `streamId` that changes per message. Whenever its value changes, the component drops the buffer, any pending unflushed chunk, the parser, and the mode lock, then rebaselines on the current `source`:

```svelte
<!-- ✅ Correct: streamId identifies the stream -->
{#each messages as message}
    <SvelteMarkdown bind:this={markdown} source="" streaming={true} streamId={message.id} />
{/each}
```

`streamId` accepts a `string` or `number` and is ignored when `streaming` is `false`. Three equivalent ways to get a clean stream, in rough order of preference:

1. **`streamId={message.id}`** — declarative; works even when the instance is recycled.
2. **`{#each messages as message (message.id)}`** — a keyed each gives each message its own instance, so there is nothing to reset. Use this when the key genuinely identifies the message rather than a slot in a virtual list.
3. **`markdown.resetStream()`** — imperative; call it _before_ the first `writeChunk()` of the new stream.

> **Note:** if you reset by changing `source` and call `writeChunk()` in the same tick, the write lands before the prop-driven reset — `writeChunk()` is synchronous while the reset runs in an effect. Prefer `streamId` or `resetStream()`, which take effect immediately.

Appending directly to `source` is still supported:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    let source = $state('')

    function onChunk(chunk: string) {
        source += chunk
    }
</script>

<SvelteMarkdown {source} streaming={true} />
```

**Performance** (2026-09-28, headless Chromium, ~24 KB corpora streamed at 32 characters per animation frame, median of five paired runs; main-thread work per frame including a forced layout):

| Scenario                         | Avg work per frame | p95 per frame | Frames over 16.7 ms |
| -------------------------------- | :----------------: | :-----------: | :-----------------: |
| Mixed prose                      |      ~2.4 ms       |  4.3–4.5 ms   |      0 of 765       |
| Mixed prose, 4 updates per frame |      ~2.9 ms       |  5.4–5.5 ms   |      0 of 192       |
| One open ~200-item list          |      ~4.7 ms       |  7.3–7.9 ms   |      1 of 754       |
| One open code fence              |      ~2.1 ms       |  3.3–3.4 ms   |      0 of 753       |

Milliseconds are machine-specific; reproduce with `pnpm perf:stream-compare`. Streamed output is checked against a one-shot parse at every sampled frame, and by a seeded fuzz suite that splits random documents at random chunk boundaries.

With `streaming` enabled, the component bypasses the document token cache, batches appended chunks around animation frames, and reuses unchanged tokens to limit DOM updates. Tail-window parsing is used when the document and parsing configuration allow it; unsupported configurations fall back to full parsing for correctness. Offset patches are applied immediately.

Default heading ids are precomputed per render pass during streaming, so duplicate-heading suffixes and `headerPrefix` stay stable across reparses. Custom heading renderers should use the provided `id` prop for this behavior; calling the `slug` prop directly advances renderer-local slug state.

**Async parsing:** extensions that declare `async: true` disable streaming and log a warning. `writeChunk()` and `resetStream()` are unavailable in that configuration. The built-in `markedMermaid()` tokenizer is synchronous; its browser renderer can render asynchronously without disabling streaming.

See the [full streaming documentation](https://markdown.svelte.page/docs/advanced/llm-streaming) and [interactive demo](https://markdown.svelte.page/examples/llm-streaming).

#### Advanced: `IncrementalParser`

`SvelteMarkdown` drives its streaming mode with the exported `IncrementalParser`. Advanced consumers can use it directly to parse a growing document and learn which tokens changed:

```typescript
import { IncrementalParser } from '@humanspeak/svelte-markdown'

const parser = new IncrementalParser({ gfm: true })
let buffer = '# Title\n\n'
parser.update(buffer)

const previous = buffer
buffer += 'Streamed paragraph'
const result = parser.update(buffer, previous) // `buffer` is known to start with `previous`
```

`update(source, appendsTo?)` accepts the full accumulated `source`, re-lexes the appended tail when possible, and compares the result with the previous update. The optional `appendsTo` is a string you have already verified `source` starts with (typically your buffer before appending a chunk); when it is the previously parsed source, the parser skips its own full-length append check. Passing a string that `source` does not start with breaks parsing, so omit it when unsure.

The returned `IncrementalUpdateResult` contains:

- `tokens` — the full new token array.
- `divergeAt` — index of the first root token that differs from the previous update.
- `divergeOffset` — source offset where that token begins, when known without scanning the stable prefix (otherwise `undefined`).
- `canReuse` — whether the first `divergeAt` token objects can be reused as-is.
- `reuseMode` — `'prefix'` (the first `divergeAt` roots are stable), `'tree'` (append-only, but a reference definition may have changed inline children anywhere, so compare the whole tree), or `'none'` (not append-only; replace the array).
- `reusedPrefixCount` — leading roots of `tokens` that are the same objects, at the same indices, as in the previous result (0 unless only the appended tail was re-lexed); a consumer that rendered the previous array unchanged can skip these indices.
- `usedTailWindow` — whether this update re-lexed only the appended tail rather than the whole source.

## Available Renderers

- `text` - Text within other elements
- `paragraph` - Paragraph (`<p>`)
- `em` - Emphasis (`<em>`)
- `strong` - Strong/bold (`<strong>`)
- `hr` - Horizontal rule (`<hr>`)
- `blockquote` - Block quote (`<blockquote>`)
- `del` - Deleted/strike-through (`<del>`)
- `link` - Link (`<a>`)
- `image` - Image (`<img>`)
- `table` - Table (`<table>`)
- `tablehead` - Table head (`<thead>`)
- `tablebody` - Table body (`<tbody>`)
- `tablerow` - Table row (`<tr>`)
- `tablecell` - Table cell (`<td>`/`<th>`)
- `list` - List (`<ul>`/`<ol>`)
- `listitem` - List item (`<li>`)
- `heading` - Heading (`<h1>`-`<h6>`)
- `codespan` - Inline code (`<code>`)
- `code` - Block of code (`<pre><code>`)
- `html` - HTML node
- `rawtext` - All other text that is going to be included in an object above
- `escape` - Backslash-escaped Markdown characters

Child tokens rendered inside list items and table cells receive only their own token fields; they do not inherit the parent list's or table's `raw`, `text`, or other fields through props.

### Optional List Renderers

For fine-grained styling:

- `orderedlistitem` - Items in ordered lists
- `unorderedlistitem` - Items in unordered lists

### HTML Renderers

The `html` renderer is special and can be configured separately to handle HTML elements:

| Element  | Description          |
| -------- | -------------------- |
| `div`    | Division element     |
| `span`   | Inline container     |
| `table`  | HTML table structure |
| `thead`  | Table header group   |
| `tbody`  | Table body group     |
| `tr`     | Table row            |
| `td`     | Table data cell      |
| `th`     | Table header cell    |
| `ul`     | Unordered list       |
| `ol`     | Ordered list         |
| `li`     | List item            |
| `code`   | Code block           |
| `em`     | Emphasized text      |
| `strong` | Strong text          |
| `a`      | Anchor/link          |
| `img`    | Image                |

This table shows a selection of the built-in tags. The exported `htmlRendererKeys` lists all built-in HTML renderer keys; custom tags can be registered too.

You can customize HTML rendering by providing your own components:

```typescript
import type { HtmlRenderers } from '@humanspeak/svelte-markdown'

const customHtmlRenderers: Partial<HtmlRenderers> = {
    div: YourCustomDivComponent,
    span: YourCustomSpanComponent
}
```

## Parsed callback

Pass a `parsed` callback to inspect the current tokens after rendering updates in the browser:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    import type { Token, TokensList } from '@humanspeak/svelte-markdown'

    const source = '# Hello'
    const handleParsed = (tokens: Token[] | TokensList) => {
        console.log('Parsed tokens:', tokens)
    }
</script>

<SvelteMarkdown {source} parsed={handleParsed} />
```

`parsed` runs in a Svelte effect, so it does not run during server-side rendering. Treat the supplied tokens as read-only: they may share objects with the parser cache or previous streaming updates. When the callback is omitted, its effect skips token updates.

## Props

| Prop               | Type                                      | Description                                                                                            |
| ------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| source             | `string \| Token[]`                       | Markdown content or pre-parsed tokens                                                                  |
| streaming          | `boolean`                                 | Enable incremental rendering for LLM streaming                                                         |
| streamId           | `string \| number`                        | Identity of the current stream. Changing it resets the streaming buffer, parser, and input-mode lock   |
| renderers          | `Partial<Renderers>`                      | Custom component overrides                                                                             |
| options            | `Partial<SvelteMarkdownOptions>`          | Marked parser configuration                                                                            |
| isInline           | `boolean`                                 | Toggle inline parsing mode                                                                             |
| extensions         | `MarkedExtension[]`                       | Built-in or third-party Marked extensions                                                              |
| parsed             | `(tokens: Token[] \| TokensList) => void` | Optional browser callback; see [Parsed callback](#parsed-callback)                                     |
| sanitizeUrl        | `SanitizeUrlFn`                           | URL sanitizer applied before render. Defaults to `defaultSanitizeUrl` (http/https/mailto/tel/relative) |
| sanitizeAttributes | `SanitizeAttributesFn`                    | Attribute sanitizer applied before render. Defaults to `defaultSanitizeAttributes`                     |

Defaults: `streaming` and `isInline` are `false`; `extensions` is empty;
`streamId` and `parsed` are unset; renderer overrides are merged with the defaults.
`writeChunk()` and `resetStream()` require a string source and `streaming={true}`.

### Parser options

Pass parser options through the `options` prop:

```svelte
<SvelteMarkdown {source} options={{ breaks: true, headerPrefix: 'article-' }} />
```

| Option         | Default | Description                                               |
| -------------- | ------- | --------------------------------------------------------- |
| `gfm`          | `true`  | GitHub Flavored Markdown, including tables and task lists |
| `breaks`       | `false` | Render single newlines as line breaks when GFM is enabled |
| `pedantic`     | `false` | Use Marked's original Markdown parsing rules              |
| `headerIds`    | `true`  | Generate heading IDs with GitHub-style slugs              |
| `headerPrefix` | `''`    | Prefix generated heading IDs                              |

Heading renderer components and snippets receive the prepared `id` so they can
preserve heading links and duplicate-heading suffixes when overriding markup.

### Pre-parsed tokens

Pass a token array as `source` to render content you have already parsed. Token
arrays render immediately, including during server-side rendering, even when
async extensions are configured. The component does not apply parser extensions
to supplied tokens; apply them when you create the array.

String sources that use async extensions render after the component mounts and
do not produce server-rendered content.

## Security

Default URL and attribute sanitizers run before link, image, and HTML props reach renderers or snippets. They provide XSS hardening, not complete HTML sanitization. Custom renderer code and extension-generated HTML remain your responsibility.

**On by default:**

- **HTML parsing** — Raw HTML is parsed with HTMLParser2 and rendered through Svelte components rather than inserted directly with `innerHTML`. HTMLParser2 itself is not a sanitizer.
- **URL protocol allowlist** (`defaultSanitizeUrl`) — Markdown link/image URLs and the HTML attributes `href`, `src`, `action`, `formaction`, `cite`, `data`, and `poster` are restricted to `http:`, `https:`, `mailto:`, `tel:`, and relative URLs. `javascript:`, `vbscript:`, `data:`, and `blob:` URIs are blocked (including mixed-case and leading-whitespace variants).
- **Event handler stripping** (`defaultSanitizeAttributes`) — All `on*` attributes (e.g. `onclick`, `onerror`, `onload`) are removed. The `srcdoc` attribute is also stripped to prevent iframe HTML injection.
- **No `<script>` or `<style>` renderers** — Both tags fall through to `UnsupportedHTML`, which renders them as visible escaped text (e.g. `<script>...</script>`) rather than executing or applying them.

**Configurable controls:**

- **Custom sanitizers** — Pass `sanitizeUrl` / `sanitizeAttributes` props to tighten or loosen the defaults. Use the exported `unsanitizedUrl` / `unsanitizedAttributes` passthroughs to disable sanitization entirely (only for trusted input).
- **Granular HTML control** — Use `allowHtmlOnly()` / `excludeHtmlOnly()` to restrict which HTML tags are rendered (see [Helper utilities](#helper-utilities-for-allowdeny-strategies)). For example, `excludeHtmlOnly(['iframe', 'form', 'embed'])` if you don't want those.
- **Full HTML lockdown** — Call `buildUnsupportedHTML()` to block all raw HTML rendering.
- **Markdown renderer control** — Use `allowRenderersOnly()` / `excludeRenderersOnly()` to limit which markdown token types are rendered.

**Known gaps (not handled by defaults):**

- **Inline `style="..."` attributes are not sanitized.** They pass through unchanged (only `on*` and `srcdoc` are stripped from attribute maps). Modern browsers don't execute JavaScript via CSS, but visual hijacking (e.g. `display:none`) and exfiltration via background-image URLs are possible.
- **`iframe`, `form`, `embed` are rendered** by default. The URL and attribute defaults still allow navigation, form submissions, and embedded content at arbitrary `http(s)` URLs. Use `excludeHtmlOnly(['iframe', 'form', 'embed'])` to remove them.
- **`srcset` and other less common URL attributes are not sanitized.** Only the attributes listed above pass through `sanitizeUrl`. Provide a custom `sanitizeAttributes` if you need broader coverage.
- **No built-in DOM sanitizer** — By design, the package does not bundle DOMPurify or similar. For untrusted input, layer a full sanitizer on top of the defaults above.

<!-- docs-kit:ecosystem start -->

## Svelte 5 ecosystem

Part of the [Humanspeak](https://humanspeak.com) family of runes-native Svelte 5 packages:

<!-- prettier-ignore-start -->
| Package | Description |
| --- | --- |
| **[@humanspeak/svelte-markdown](https://markdown.svelte.page)** — _this package_ | Runtime markdown renderer for Svelte |
| [@humanspeak/svelte-virtual-list](https://virtuallist.svelte.page) | Virtual scrolling for Svelte |
| [@humanspeak/svelte-motion](https://motion.svelte.page) | Framer Motion for Svelte 5 |
| [@humanspeak/svelte-headless-table](https://table.svelte.page) | Headless data tables for Svelte |
| [@humanspeak/svelte-virtual-chat](https://virtualchat.svelte.page) | Virtual chat viewport for Svelte 5 |
| [@humanspeak/svelte-diff](https://diff.svelte.page) | Diff comparison for Svelte |
| [@humanspeak/svelte-purify](https://purify.svelte.page) | HTML sanitisation for Svelte |
| [@humanspeak/memory-cache](https://memory.svelte.page) | In-memory cache for TypeScript |
| [@humanspeak/svelte-json-view-lite](https://jsonview.svelte.page) | JSON tree viewer for Svelte 5 |
| [@humanspeak/svelte-scoped-props](https://scoped.svelte.page) | Scoped class props for Svelte |
<!-- prettier-ignore-end -->

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ❤️ by [Humanspeak](https://humanspeak.com)

<!-- docs-kit:ecosystem end -->
