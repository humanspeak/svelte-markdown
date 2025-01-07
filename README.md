# Svelte Markdown

[![NPM version](https://img.shields.io/npm/v/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![Build Status](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml/badge.svg)](https://github.com/humanspeak/svelte-markdown/actions/workflows/npm-publish.yml)
[![Coverage Status](https://coveralls.io/repos/github/humanspeak/svelte-markdown/badge.svg?branch=main)](https://coveralls.io/github/humanspeak/svelte-markdown?branch=main)
[![License](https://img.shields.io/npm/l/@humanspeak/svelte-markdown.svg)](https://github.com/humanspeak/svelte-markdown/blob/main/LICENSE.md)
[![Downloads](https://img.shields.io/npm/dm/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![CodeQL](https://github.com/humanspeak/svelte-markdown/actions/workflows/codeql.yml/badge.svg)](https://github.com/humanspeak/svelte-markdown/actions/workflows/codeql.yml)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)
[![Types](https://img.shields.io/npm/types/@humanspeak/svelte-markdown.svg)](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/humanspeak/svelte-markdown/graphs/commit-activity)

A markdown parser that renders into Svelte Components. Inspired by [ReactMarkdown](https://github.com/remarkjs/react-markdown).

Feel free to play with it and leave comments on its [homepage](https://markdown.svelte.page)

Rewriten for Svelte5 and all the updated goodies that have happened over the last two years. Also moved to Typescript because its the future!

## Installation

You can install it with

```bash
npm i -S @humanspeak/svelte-markdown
```

Or with your preferred package manager:

```bash
pnpm add @humanspeak/svelte-markdown
yarn add @humanspeak/svelte-markdown
```

## Usage with Svelte 5

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

The package is written in TypeScript and includes full type definitions. You can import types for custom renderers:

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

## Usage

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    const source = `
  # This is a header

This is a paragraph.

* This is a list
* With two items
  1. And a sublist
  2. That is ordered
    * With another
    * Sublist inside

| And this is | A table |
|-------------|---------|
| With two    | columns |`
</script>

<SvelteMarkdown {source} />
```

This would render something like

```html
<h1>This is a header</h1>
<p>This is a paragraph.</p>
<ul>
    <li>This is a list</li>
    <li>
        With two items
        <ol start="1">
            <li>And a sublist</li>
            <li>
                That is ordered
                <ul>
                    <li>With another</li>
                    <li>Sublist inside</li>
                </ul>
            </li>
        </ol>
    </li>
</ul>
<table>
    <thead>
        <tr>
            <th>And this is</th>
            <th>A table</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>With two</td>
            <td>columns</td>
        </tr>
    </tbody>
</table>
```

## Note

Just like with React Markdown, this package doesn't use `{@html ...}`. Even if you add HTML tags to the code, all if it is managed by either the defaults or YOU! If you want to spice things up you can! 🥰

## Props

The SvelteMarkdown component accepts the following props:

- `source` - _string_ or _array_ The Markdown source to be parsed, or an array of tokens to be rendered directly.
- `renderers` - _object (optional)_ An object where the keys represent a node type and the value is a Svelte component. This object will be merged with the default renderers. For now you can check how the default renderers are written in the source code at `src/renderers`.
- `renderes.html` - _object (optional)_ An object where the key represents the HTML tag and the value is a Svelte component. This object will be merged with the default renderers. For now you can check how the default renderers are written in the source code at `src/renderers/html`.
- `options` - _object (optional)_ An object containing [options for Marked](https://marked.js.org/using_advanced#options)

## Renderers

To create custom renderer for an element, you can create a Svelte component with the default props ([you can check them here](https://marked.js.org/using_pro#renderer)), for example:

_`ImageComponent.svelte`_

```svelte
<script lang="ts">
    interface Props {
        href?: string
        title?: string
        text?: string
    }

    const { href = '', title = undefined, text = '' }: Props = $props()
</script>

<img src={href} {title} alt={text} />
```

So you can import the component and pass to the `renderers` props:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import ImageComponent from './renderers/ImageComponent.svelte'
    export let content
</script>

<SvelteMarkdown source={content} renderers={{ image: ImageComponent }} />
```

## Rendering From Tokens

For greater flexibility, an array of tokens may be given as `source`, in which case parsing is skipped and the tokens will be rendered directly. This alows you to generate and transform the tokens freely beforehand. Example:

```html
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { marked } from 'marked'

    const tokens = marked.lexer('this is an **example**')

    marked.walkTokens(tokens, (token) => {
        if (token.type == 'strong') token.type = 'em'
        token.raw = token.raw.toUpperCase()
    })
</script>

<SvelteMarkdown source="{tokens}" />
```

This will render the following:

```html
<p>THIS IS AN <em>EXAMPLE</em></p>
```

## Events

A `parsed` event will be fired when the final tokens have been calculated, allowing you to access the raw token array if needed for things like generating Table of Contents from headings.

```html
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const source = `# This is a header`

    const handleParsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }
</script>

<SvelteMarkdown {source} parsed="{handleParsed}"></SvelteMarkdown>
```

## Available renderers

These would be the property names expected by the `renderers` option.

- `text` - Text rendered inside of other elements, such as paragraphs
- `paragraph` - Paragraph (`<p>`)
- `em` - Emphasis (`<em>`)
- `strong` - Strong/bold (`<strong>`)
- `hr` - Horizontal rule / thematic break (`<hr>`)
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

For fine detail styling of lists, it can be useful to differentiate between ordered and un-ordered lists.
If either key is missing, the default `listitem` will be used. There are two
optional keys in the `renderers` option which can provide this:

- `orderedlistitem` - A list item appearing inside an ordered list
- `unorderedlistitem` A list item appearing inside an un-ordered list

As an example, if we have an `orderedlistitem`:

```html
<style>
    li::marker {
        color: blue;
    }
</style>

<li><slot></slot></li>
```

Then numbers at the start of ordered list items would be colored blue. Bullets at the start of unordered list items
would remain the default text color.

### Inline Markdown

To use [inline markdown](https://marked.js.org/using_advanced#inline), you can assign the prop `isInline` to the component.

```html
<SvelteMarkdown {source} isInline />
```

## HTML rendering

The package supports mixing HTML and Markdown content seamlessly within the same document. You can use HTML tags alongside Markdown syntax, and both will be properly rendered through their respective components.

### Basic HTML in Markdown

You can freely mix HTML tags with Markdown syntax:

```markdown
This is a **markdown** paragraph with <em>HTML emphasis</em> mixed in.

<div style="color: blue">
  ### This is a Markdown heading inside HTML
  And here's some **bold** text too!
</div>
```

### Tables with Mixed Content

Tables support both Markdown and HTML formatting in cells:

```markdown
| Feature |  Markdown   |                   HTML |
| ------- | :---------: | ---------------------: |
| Bold    |  **text**   |  <strong>text</strong> |
| Italic  |   _text_    |          <em>text</em> |
| Links   | [text](url) | <a href="url">text</a> |
```

### Interactive HTML Elements

HTML interactive elements like `<details>` work seamlessly:

```markdown
<details>
<summary>Click to expand</summary>

- This is a markdown list
- Inside an HTML details element
- Supporting **bold** and _italic_ text

</details>
```

### HTML Block Elements

HTML block elements can contain Markdown content:

```markdown
<blockquote>
  ### Markdown Heading in Blockquote

- List item with **bold**
- Another item with _italic_
  </blockquote>
```

### Component Customization

You can customize how HTML elements are rendered by providing custom components in the `renderers.html` prop:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import CustomBlockquote from './renderers/CustomBlockquote.svelte'

    const source = `
        <blockquote>
            This will use the custom renderer
        </blockquote>
    `
</script>

<SvelteMarkdown
    {source}
    renderers={{
        html: {
            blockquote: CustomBlockquote
        }
    }}
/>
```

### Important Notes

1. The HTML rendering is handled by dedicated Svelte components, ensuring proper integration with Svelte's reactivity system.

2. All HTML elements are sanitized by default for security. Custom HTML attributes are preserved and passed to the corresponding components.

3. The package includes renderers for all standard HTML5 elements, which can be found in the source code at `src/renderers/html/`.

4. When mixing HTML and Markdown, the parser maintains proper nesting and hierarchy of elements.

5. For security reasons, script tags and potentially harmful HTML attributes are stripped out during parsing.

## Developing

Some tests have been added to the `tests` folder. You can clone this repo and create another svelte app and link it to this repo to try modifying it.

The current extenral dependencies are:

- [Marked](https://marked.js.org/)
- [Github-Slugger](https://github.com/Flet/github-slugger)
- [HTMLParser2](https://github.com/fb55/htmlparser2)

## Related

- [ReactMarkdown](https://github.com/remarkjs/react-markdown) - React library to render markdown using React components. Inspiration for this library
- [Svelte](https://svelte.dev) - JavaScript front-end framework
- [Original](https://github.com/pablo-abc/svelte-markdown) - Original component

Made with ♥ by [Humanspeak](https://humanspeak.com)
