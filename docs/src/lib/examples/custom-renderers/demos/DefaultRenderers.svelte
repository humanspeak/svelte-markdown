<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const markdown = `## Custom Renderers Demo

### How It Works

Svelte Markdown lets you **control which renderers are active**. This is useful for:

1. Restricting markdown features in user-generated content
2. Creating simplified markdown views
3. Building *focused* content editors

#### Code Example

Use \`allowRenderersOnly\` to whitelist specific renderers:

\`\`\`js
import { allowRenderersOnly } from '@humanspeak/svelte-markdown'

const renderers = allowRenderersOnly([
    'paragraph', 'heading', 'text',
    'strong', 'em', 'link'
])
\`\`\`

Check out [the documentation](https://markdown.svelte.page) for more details.

---

> Tip: Disabled renderers simply won't render their content, keeping your output clean and predictable.

Here is a table for reference:

| Renderer | Description |
|----------|-------------|
| paragraph | Basic text blocks |
| heading | h1-h6 elements |
| link | Anchor tags |
| codespan | Inline code |
| code | Code blocks |

- Item one
- Item two
- Item three`
</script>

<!--
  Default renderers — no override. Every built-in renderer is active:
  headings, paragraphs, links, code blocks, tables, blockquotes,
  horizontal rules, and lists all paint into the DOM normally.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} />
</div>
