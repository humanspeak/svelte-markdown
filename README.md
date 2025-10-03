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

- ⚡ **Intelligent Token Caching** - 50-200x faster re-renders with automatic LRU cache (< 1ms for cached content)
- 🚀 Full markdown syntax support through Marked
- 💪 Complete TypeScript support with strict typing
- 🎨 Customizable component rendering system
- 🔒 Secure HTML parsing via HTMLParser2
- 🎯 GitHub-style slug generation for headers
- ♿ WCAG 2.1 accessibility compliance
- 🧪 Comprehensive test coverage (vitest and playwright)
- 🔄 Svelte 5 runes compatibility
- 🛡️ XSS protection and sanitization
- 🎨 Custom Marked extensions support (e.g., GitHub-style alerts)
- 🔍 Improved attribute handling and component isolation
- 📦 Enhanced token cleanup and nested content support

## Recent Updates

### Performance Improvements

- **🚀 NEW: Intelligent Token Caching** - Built-in caching layer provides 50-200x speedup for repeated content
    - Automatic cache hits in <1ms (vs 50-200ms parsing)
    - LRU eviction with configurable size (default: 50 documents)
    - TTL support for fresh content (default: 5 minutes)
    - Zero configuration needed - works automatically
    - Handles ~95% of re-renders from cache in typical usage

### New Features

- Improved HTML attribute isolation for nested components
- Enhanced token cleanup for better nested content handling
- Added proper attribute inheritance control
- Implemented strict debugging checks in CI/CD pipeline

### Testing Improvements

- Enhanced Playwright E2E test coverage
- Added comprehensive tests for custom extensions
- Improved test reliability with proper component mounting checks
- Added specific test cases for nested component scenarios
- **Note:** Performance tests use a higher threshold for Firefox due to slower execution in CI environments. See `tests/performance.test.ts` for details.

### CI/CD Enhancements

- Added automated debugging statement detection
- Improved release workflow with GPG signing
- Enhanced PR validation and automated version bumping
- Added manual workflow triggers for better release control
- Implemented monthly cache cleanup

## Installation

```bash
npm i -S @humanspeak/svelte-markdown
```

Or with your preferred package manager:

```bash
pnpm add @humanspeak/svelte-markdown
yarn add @humanspeak/svelte-markdown
```

## External Dependencies

This package carefully selects its dependencies to provide a robust and maintainable solution:

### Core Dependencies

- **marked**
    - Industry-standard markdown parser
    - Battle-tested in production
    - Extensive security features

- **github-slugger**
    - GitHub-style heading ID generation
    - Unicode support
    - Collision handling

- **htmlparser2**
    - High-performance HTML parsing
    - Streaming capabilities
    - Security-focused design

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

## ⚡ Performance

### Built-in Intelligent Caching

The package includes an automatic token caching system that dramatically improves performance for repeated content:

**Performance Gains:**

- **First render:** ~150ms (for 100KB markdown)
- **Cached re-render:** <1ms (50-200x faster!)
- **Memory efficient:** LRU eviction keeps cache bounded
- **Smart invalidation:** TTL ensures fresh content

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    let content = $state('# Hello World')

    // Change content back and forth
    const toggle = () => {
        content = content === '# Hello World' ? '# Goodbye World' : '# Hello World'
    }
</script>

<!-- First time parsing each: ~50ms -->
<!-- Subsequent renders: <1ms from cache! -->
<button onclick={toggle}>Toggle Content</button>
<SvelteMarkdown source={content} />
```

**How it works:**

- Automatically caches parsed tokens using fast FNV-1a hashing
- Cache key combines markdown source + parser options
- LRU eviction (default: 50 documents, configurable)
- TTL expiration (default: 5 minutes, configurable)
- Zero configuration required - works automatically!

**Advanced cache control:**

```typescript
import { tokenCache, TokenCache } from '@humanspeak/svelte-markdown'

// Use global cache (shared across app)
const cached = tokenCache.getTokens(markdown, options)

// Create custom cache instance
const myCache = new TokenCache({
    maxSize: 100, // Cache up to 100 documents
    ttl: 10 * 60 * 1000 // 10 minute TTL
})

// Manual cache management
tokenCache.clearAllTokens() // Clear all
tokenCache.deleteTokens(markdown, options) // Clear specific
```

**Best for:**

- ✅ Static documentation sites
- ✅ Real-time markdown editors
- ✅ Component re-renders with same content
- ✅ Navigation between pages
- ✅ User-generated content viewed multiple times

## TypeScript Support

The package is written in TypeScript and includes full type definitions:

```typescript
import type {
    Renderers,
    Token,
    TokensList,
    SvelteMarkdownOptions
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

| Prop      | Type                    | Description                           |
| --------- | ----------------------- | ------------------------------------- |
| source    | `string \| Token[]`     | Markdown content or pre-parsed tokens |
| renderers | `Partial<Renderers>`    | Custom component overrides            |
| options   | `SvelteMarkdownOptions` | Marked parser configuration           |
| isInline  | `boolean`               | Toggle inline parsing mode            |

## Security

The package includes several security features:

- XSS protection through HTML sanitization
- Secure HTML parsing with HTMLParser2
- Safe handling of HTML entities
- Protection against malicious markdown injection

## License

MIT © [Humanspeak, Inc.](LICENSE)

## Credits

Made with ❤️ by [Humanspeak](https://humanspeak.com)
