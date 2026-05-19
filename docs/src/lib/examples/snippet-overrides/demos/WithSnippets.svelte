<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import {
        Check,
        ChevronRight,
        ExternalLink,
        Lightbulb,
        Scissors,
        WandSparkles
    } from '@lucide/svelte'

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
  Snippet overrides styled with the brut palette so they flip cleanly
  between light and dark themes — every accent is a CSS variable from
  docs-kit's brutalist tokens rather than a hard-coded Tailwind color.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown}>
        {#snippet paragraph({ children })}
            <p class="so-paragraph">{@render children?.()}</p>
        {/snippet}

        {#snippet heading({ depth, children })}
            <svelte:element this={`h${depth}`} class="so-heading">
                {#if depth === 1}
                    <Scissors class="size-3.5" />
                {:else if depth === 2}
                    <WandSparkles class="size-3.5" />
                {:else}
                    <ChevronRight class="size-3" />
                {/if}
                {@render children?.()}
            </svelte:element>
        {/snippet}

        {#snippet link({ href, title, children })}
            <a {href} {title} target="_blank" rel="noopener noreferrer" class="so-link">
                {@render children?.()}
                <ExternalLink class="size-3" />
            </a>
        {/snippet}

        {#snippet blockquote({ children })}
            <aside class="so-callout" role="note">
                <span class="so-callout-icon"><Lightbulb class="size-4" /></span>
                <div>{@render children?.()}</div>
            </aside>
        {/snippet}

        {#snippet listitem({ children })}
            <li class="so-listitem">
                <span class="so-listitem-bullet"><Check class="size-3" /></span>
                <div>{@render children?.()}</div>
            </li>
        {/snippet}

        {#snippet code({ lang, text })}
            <div class="so-code">
                {#if lang}
                    <div class="so-code-lang">{lang}</div>
                {/if}
                <pre><code>{text}</code></pre>
            </div>
        {/snippet}

        {#snippet tablecell({ header, align, children })}
            {#if header}
                <th class="so-th" style:text-align={align}>{@render children?.()}</th>
            {:else}
                <td class="so-td" style:text-align={align}>{@render children?.()}</td>
            {/if}
        {/snippet}
    </SvelteMarkdown>
</div>

<style>
    /* Paragraph: left-rail accent + tinted bg using the same accent-soft
       token the brut-themed verdict panel uses on /compare. */
    :global(.so-paragraph) {
        border-left: 3px solid var(--brut-accent);
        background: var(--brut-accent-soft);
        margin: 0.75rem 0;
        padding: 0.5rem 0.75rem 0.5rem 1rem;
        border-radius: 0;
        color: var(--brut-ink);
    }
    /* Heading: accent ink + inline lucide icon. */
    :global(.so-heading) {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        color: var(--brut-accent);
    }
    /* Link: accent text, external icon, no underline by default. */
    :global(.so-link) {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        color: var(--brut-accent);
        font-weight: 600;
        text-decoration: none;
    }
    :global(.so-link:hover) {
        text-decoration: underline;
    }
    /* Callout (blockquote): brut bg-2 surface, accent rule, ink-2 text,
       lightbulb icon coloured to match the accent. Honours light and dark
       in one rule. */
    :global(.so-callout) {
        display: flex;
        gap: 12px;
        margin: 1rem 0;
        padding: 0.75rem 1rem;
        background: var(--brut-bg-2);
        border-left: 3px solid var(--brut-accent);
        color: var(--brut-ink-2);
        border-radius: 0;
    }
    :global(.so-callout-icon) {
        color: var(--brut-accent);
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
    }
    :global(.so-callout strong) {
        color: var(--brut-ink);
    }
    /* List items: green-check bullet swapped for the accent colour. */
    :global(.so-listitem) {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        list-style: none;
        margin-left: 0;
    }
    :global(.so-listitem-bullet) {
        color: var(--brut-accent);
        margin-top: 4px;
        flex-shrink: 0;
        display: inline-flex;
    }
    /* Code block: brut-styled surface that flips with the theme — no
       hardcoded gray-900 / green-400. The lang strip on top picks up the
       accent so it reads as "branded chrome". */
    :global(.so-code) {
        position: relative;
        margin: 1rem 0;
        overflow: hidden;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
    }
    :global(.so-code-lang) {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        padding: 4px 12px;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-weight: 600;
    }
    :global(.so-code pre) {
        margin: 0;
        padding: 14px 16px;
        overflow-x: auto;
        background: var(--brut-bg-2);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.65;
    }
    :global(.so-code code) {
        background: transparent;
        color: inherit;
        padding: 0;
        border: 0;
    }
    /* Table cells: head sits on bg-2 with accent ink, body cells on bg
       with hairline tops. */
    :global(.so-th) {
        background: var(--brut-bg-2);
        color: var(--brut-accent);
        padding: 0.5rem 0.875rem;
        font-size: 10.5px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-weight: 600;
    }
    :global(.so-td) {
        padding: 0.5rem 0.875rem;
        border-top: 1px solid var(--brut-rule);
        font-size: 0.875rem;
        color: var(--brut-ink-2);
    }
</style>
