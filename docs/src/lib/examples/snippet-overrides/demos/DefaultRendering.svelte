<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const markdown = `## Snippet Overrides Demo

### Inline Customization

Svelte 5 snippets let you **customize rendering** directly in your template. No separate files needed for simple tweaks.

#### Key Benefits

1. **Inline** — customize right where you use the component
2. **Type-safe** — full TypeScript support for snippet props
3. **Composable** — mix snippets with component renderers

Check out [the documentation](https://markdown.svelte.page/docs/renderers/snippet-overrides) for the full guide.

---

> **Tip:** Snippets take precedence over component renderers. Use them for quick, one-off overrides.

Here is a feature comparison:

| Approach | Files | Reusable | Best For |
|----------|-------|----------|----------|
| Snippets | 0 | No | Quick tweaks |
| Components | 1+ | Yes | Complex logic |

- First item in the list
- Second item with **bold text**
- Third item with a [link](https://svelte.dev)

\`\`\`javascript
// Snippet overrides are this simple:
<SvelteMarkdown source={md}>
    {#snippet paragraph({ children })}
        <p class="custom">{@render children?.()}</p>
    {/snippet}
</SvelteMarkdown>
\`\`\``
</script>

<!--
  Default rendering — no overrides. Every markdown element renders with
  its built-in renderer.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} />
</div>
