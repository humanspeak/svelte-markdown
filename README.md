# @humanspeak/svelte-markdown

A powerful, customizable markdown renderer for Svelte with TypeScript support. Built as a successor to the original svelte-markdown package by Pablo Berganza, now maintained and enhanced by Humanspeak, Inc.

[![NPM version](https://img.shields.io/npm/v/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![Build Status](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml)
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

- 🔒 **Secure HTML parsing** via HTMLParser2 with XSS protection
- 🚀 Full markdown syntax support through Marked
- 💪 Complete TypeScript support with strict typing
- 🔄 Svelte 5 runes compatibility
- ✂️ Inline snippet overrides — customize renderers without separate files
- 🎨 Customizable component rendering system
- ♿ WCAG 2.1 accessibility compliance
- 🎯 GitHub-style slug generation for headers
- 🧪 Comprehensive test coverage (vitest and playwright)
- 🧩 First-class marked extensions support via `extensions` prop (e.g., KaTeX math, alerts)
- ⚡ Intelligent token caching (50-200x faster re-renders)
- 🖼️ Smart image lazy loading with fade-in animation

## Installation

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

## TypeScript Support

The package is written in TypeScript and includes full type definitions:

```typescript
import type {
    Renderers,
    Token,
    TokensList,
    SvelteMarkdownOptions,
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
- `Unsupported` and `UnsupportedHTML` are available if you want a pass-through fallback strategy.

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

If you would like to extend other renderers please take a look inside the [renderers folder](https://github.com/humanspeak/svelte-markdown/tree/main/src/lib/renderers) for the default implentation of them. If you would like feature additions please feel free to open an issue!

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

    {#snippet heading({ depth, children })}
        {#if depth === 1}
            <h1 class="title">{@render children?.()}</h1>
        {:else}
            <h2>{@render children?.()}</h2>
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

All HTML snippets share a uniform props interface: `{ attributes?: Record<string, any>, children?: Snippet }`.

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

## Marked Extensions

Use third-party [marked extensions](https://marked.js.org/using_advanced#extensions) via the `extensions` prop. The component handles registering tokenizers internally — you just provide renderers for the custom token types.

### KaTeX Math Rendering

```bash
npm install marked-katex-extension katex
```

**Component renderer approach:**

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import markedKatex from 'marked-katex-extension'
    import KatexRenderer from './KatexRenderer.svelte'

    interface KatexRenderers extends Renderers {
        inlineKatex: RendererComponent
        blockKatex: RendererComponent
    }

    const renderers: Partial<KatexRenderers> = {
        inlineKatex: KatexRenderer,
        blockKatex: KatexRenderer
    }
</script>

<svelte:head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css" crossorigin="anonymous" />
</svelte:head>

<SvelteMarkdown
    source="Euler's identity: $e^{{i\pi}} + 1 = 0$"
    extensions={[markedKatex({ throwOnError: false })]}
    {renderers}
/>
```

Where `KatexRenderer.svelte` is:

```svelte
<script lang="ts">
    import katex from 'katex'

    interface Props {
        text: string
        displayMode?: boolean
    }
    const { text, displayMode = false }: Props = $props()

    const html = $derived(katex.renderToString(text, { throwOnError: false, displayMode }))
</script>

{@html html}
```

**Snippet override approach** (no separate component file needed):

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import katex from 'katex'
    import markedKatex from 'marked-katex-extension'
</script>

<svelte:head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css" crossorigin="anonymous" />
</svelte:head>

<SvelteMarkdown
    source="Euler's identity: $e^{{i\pi}} + 1 = 0$"
    extensions={[markedKatex({ throwOnError: false })]}
>
    {#snippet inlineKatex(props)}
        {@html katex.renderToString(props.text, { displayMode: false })}
    {/snippet}
    {#snippet blockKatex(props)}
        {@html katex.renderToString(props.text, { displayMode: true })}
    {/snippet}
</SvelteMarkdown>
```

### Mermaid Diagrams (Async Rendering)

The package includes built-in `markedMermaid` and `MermaidRenderer` helpers for Mermaid diagram support. Install mermaid as an optional peer dependency:

```bash
npm install mermaid
```

Then use the built-in helpers — no boilerplate needed:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { markedMermaid, MermaidRenderer } from '@humanspeak/svelte-markdown/extensions'

    interface MermaidRenderers extends Renderers {
        mermaid: RendererComponent
    }

    const renderers: Partial<MermaidRenderers> = {
        mermaid: MermaidRenderer
    }
</script>

<SvelteMarkdown source={markdown} extensions={[markedMermaid()]} {renderers} />
```

`markedMermaid()` is a zero-dependency tokenizer that converts ` ```mermaid ` code blocks into custom tokens. `MermaidRenderer` lazy-loads mermaid in the browser, renders SVG asynchronously, and automatically re-renders when dark/light mode changes.

Component renderers are recommended over snippets for async extensions since snippets run synchronously during render.

### How It Works

Marked extensions define custom token types with a `name` property (e.g., `inlineKatex`, `blockKatex`, `alert`). When you pass extensions via the `extensions` prop, SvelteMarkdown automatically extracts these token type names and makes them available as both **component renderer keys** and **snippet override names**.

To find the token type names for any extension, check its source or documentation for the `name` field in its `extensions` array:

```js
// Example: marked-katex-extension registers tokens named "inlineKatex" and "blockKatex"
// → use renderers={{ inlineKatex: ..., blockKatex: ... }}
// → or {#snippet inlineKatex(props)} and {#snippet blockKatex(props)}

// Example: a custom alert extension registers a token named "alert"
// → use renderers={{ alert: AlertComponent }}
// → or {#snippet alert(props)}
```

Each snippet/component receives the token's properties as props (e.g., `text`, `displayMode` for KaTeX; `text`, `level` for alerts).

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

## Performance

### Intelligent Token Caching

Parsed tokens are automatically cached using an LRU strategy, providing 50-200x faster re-renders for previously seen content (< 1ms vs 50-200ms). The cache uses FNV-1a hashing keyed on source + options, with LRU eviction (default 50 documents) and TTL expiration (default 5 minutes). No configuration required.

```typescript
import { tokenCache, TokenCache } from '@humanspeak/svelte-markdown'

// Manual cache management
tokenCache.clearAllTokens()
tokenCache.deleteTokens(markdown, options)

// Custom cache instance
const myCache = new TokenCache({ maxSize: 100, ttl: 10 * 60 * 1000 })
```

### Smart Image Lazy Loading

Images automatically lazy load using native `loading="lazy"` and IntersectionObserver prefetching, with a smooth fade-in animation and error state handling. To disable lazy loading, provide a custom Image renderer:

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

You can customize HTML rendering by providing your own components:

```typescript
import type { HtmlRenderers } from '@humanspeak/svelte-markdown'

const customHtmlRenderers: Partial<HtmlRenderers> = {
    div: YourCustomDivComponent,
    span: YourCustomSpanComponent
}
```

## Events

The component emits a `parsed` event when tokens are calculated:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const handleParsed = (tokens: Token[] | TokensList) => {
        console.log('Parsed tokens:', tokens)
    }
</script>

<SvelteMarkdown {source} parsed={handleParsed} />
```

## Props

| Prop       | Type                    | Description                                      |
| ---------- | ----------------------- | ------------------------------------------------ |
| source     | `string \| Token[]`     | Markdown content or pre-parsed tokens            |
| renderers  | `Partial<Renderers>`    | Custom component overrides                       |
| options    | `SvelteMarkdownOptions` | Marked parser configuration                      |
| isInline   | `boolean`               | Toggle inline parsing mode                       |
| extensions | `MarkedExtension[]`     | Third-party marked extensions (e.g., KaTeX math) |

## Security

This package takes a defense-in-depth approach to security:

- **Secure HTML parsing** - All HTML is parsed through HTMLParser2's streaming parser rather than `innerHTML`, preventing script injection
- **XSS protection** - HTML entities are safely handled; malicious markdown injection is neutralized during parsing
- **Granular HTML control** - Use `allowHtmlOnly()` / `excludeHtmlOnly()` to restrict which HTML tags are rendered (see [Helper utilities](#helper-utilities-for-allowdeny-strategies))
- **Full HTML lockdown** - Call `buildUnsupportedHTML()` to block all raw HTML rendering
- **Markdown renderer control** - Use `allowRenderersOnly()` / `excludeRenderersOnly()` to limit which markdown token types are rendered
- **No built-in sanitizer** - By design, the package does not bundle a sanitizer. Integrate your own (e.g., DOMPurify) if you accept untrusted input

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ❤️ by [Humanspeak](https://humanspeak.com)
