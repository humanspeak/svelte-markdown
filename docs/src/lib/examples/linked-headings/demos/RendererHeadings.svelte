<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import LinkedHeading from './LinkedHeading.svelte'

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
  Custom component renderer — `LinkedHeading.svelte` replaces the default
  heading renderer for every depth. Best for reuse across multiple pages
  or when the override needs its own complex state.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} renderers={{ heading: LinkedHeading }} />
</div>
