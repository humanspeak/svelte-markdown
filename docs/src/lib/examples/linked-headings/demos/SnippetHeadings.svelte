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
  Snippet override — an inline `{#snippet heading()}` block adds a
  hover-reveal `#` anchor link after each heading. Best for one-off
  customizations that don't need their own component file.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown}>
        {#snippet heading({ depth, text, slug, options, children })}
            {@const id = options.headerIds ? options.headerPrefix + slug(text) : undefined}
            <svelte:element this={`h${depth}`} {id} class="lh-heading">
                {@render children?.()}
                {#if id}
                    <a href="#{id}" class="lh-anchor" aria-label="Link to {text}"> # </a>
                {/if}
            </svelte:element>
        {/snippet}
    </SvelteMarkdown>
</div>

<style>
    /* Reveal-on-hover anchor styled with brut tokens so it flips cleanly
       between light and dark themes. The wrapper heading uses `position:
       relative` so the absolute-positioned anchor (when we'd want one)
       could anchor to it; for now the anchor sits inline after the text. */
    :global(.lh-heading) {
        position: relative;
    }
    :global(.lh-anchor) {
        margin-left: 8px;
        color: var(--brut-accent);
        text-decoration: none;
        opacity: 0;
        font-size: 0.7em;
        transition: opacity 0.15s;
    }
    :global(.lh-heading:hover .lh-anchor),
    :global(.lh-anchor:focus-visible) {
        opacity: 1;
    }
</style>
