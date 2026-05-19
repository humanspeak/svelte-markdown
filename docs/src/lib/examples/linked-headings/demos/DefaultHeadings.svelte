<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const markdown = `## Linked Headings Demo

### Getting Started

Headings rendered by svelte-markdown include \`id\` attributes by default, but they don't have clickable anchor links. This example shows two ways to add them.

#### Installation

Install the package with your preferred package manager:

\`\`\`bash
pnpm add @humanspeak/svelte-markdown
\`\`\`

### Configuration

Configure the component with your markdown source and any options you need.

#### Basic Usage

Import and use the component in your Svelte file.

### Advanced Topics

#### Custom Slug Functions

You can provide a custom slug function for full control over heading IDs.

##### Nested Heading Example

This is a deeply nested heading to show all levels work correctly.`
</script>

<!--
  Default heading rendering — no override. Each heading gets an `id`
  derived from its text (so `#getting-started` works in the URL), but
  there's no visible anchor link.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} />
</div>
