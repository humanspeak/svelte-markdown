# @humanspeak/svelte-markdown

A powerful, customizable markdown renderer for Svelte with TypeScript support. Built as a successor to the original svelte-markdown package by Pablo Berganza, now maintained and enhanced by Humanspeak, Inc.

[![NPM version](https://img.shields.io/npm/v/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![Build Status](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml)
[![Coverage Status](https://coveralls.io/repos/github/humanspeak/svelte-markdown/badge.svg?branch=main)](https://coveralls.io/github/humanspeak/svelte-markdown?branch=main)
[![License](https://img.shields.io/npm/l/@humanspeak/svelte-markdown.svg)](https://github.com/humanspeak/svelte-markdown/blob/main/LICENSE.md)
[![Downloads](https://img.shields.io/npm/dm/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![CodeQL](https://github.com/humanspeak/svelte-markdown/actions/workflows/codeql.yml/badge.svg)](https://github.com/humanspeak/svelte-markdown/actions/workflows/codeql.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Types](https://img.shields.io/npm/types/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/humanspeak/svelte-markdown/graphs/commit-activity)

## Features

- 🚀 Full markdown syntax support through Marked
- 💪 Complete TypeScript support with strict typing
- 🎨 Customizable component rendering system
- 🔒 Secure HTML parsing via HTMLParser2
- 🎯 GitHub-style slug generation for headers
- ♿ WCAG 2.1 accessibility compliance
- 🧪 Comprehensive test coverage (vitest and playwright)
- 🔄 Svelte 5 runes compatibility

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
    SvelteMarkdownOptions
} from '@humanspeak/svelte-markdown'
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
        text?: string
    }

    const { href = '', title = '', text = '', children }: Props = $props()
</script>

<a {href} {title} class="custom-link">
    {@render children?.() ?? text}
</a>
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

## License

MIT © [Humanspeak, Inc.](LICENSE.md)

## Credits

Made with ♥ by [Humanspeak](https://humanspeak.com)
