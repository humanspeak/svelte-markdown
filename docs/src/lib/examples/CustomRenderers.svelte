<script lang="ts">
    import SvelteMarkdown, { allowRenderersOnly } from '@humanspeak/svelte-markdown'

    const sampleMarkdown = `# Custom Renderers Demo

## How It Works

Svelte Markdown lets you **control which renderers are active**. This is useful for:

1. Restricting markdown features in user-generated content
2. Creating simplified markdown views
3. Building *focused* content editors

### Code Example

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

    let mode: 'default' | 'custom' = $state('default')

    const customRenderers = $derived(
        mode === 'custom'
            ? allowRenderersOnly([
                  'paragraph',
                  'heading',
                  'text',
                  'strong',
                  'em',
                  'link',
                  'list',
                  'listitem',
                  'codespan'
              ])
            : {}
    )
</script>

<div class="mx-auto w-full max-w-4xl p-4">
    <!-- Header -->
    <div class="mb-6">
        <h2 class="text-foreground text-2xl font-bold">Custom Renderers</h2>
        <p class="text-muted-foreground mt-1 text-sm">
            Toggle between default and filtered rendering to see how
            <code class="bg-muted rounded px-1.5 py-0.5 text-xs">allowRenderersOnly</code>
            controls which markdown features are active.
        </p>
    </div>

    <!-- Mode Toggle -->
    <div class="mb-6 flex items-center gap-3">
        <button
            onclick={() => (mode = 'default')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'default'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Default Renderers
        </button>
        <button
            onclick={() => (mode = 'custom')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'custom'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Filtered Renderers
        </button>
    </div>

    <!-- Info Banner -->
    <div class="border-border bg-card mb-6 rounded-xl border p-4 shadow-sm">
        {#if mode === 'default'}
            <div class="flex items-start gap-3">
                <div
                    class="bg-brand-500/10 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                >
                    <i class="fa-solid fa-check"></i>
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">All Renderers Active</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Every markdown feature is rendered: headings, paragraphs, links, code
                        blocks, tables, blockquotes, horizontal rules, and lists.
                    </p>
                </div>
            </div>
        {:else}
            <div class="flex items-start gap-3">
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm text-amber-600"
                >
                    <i class="fa-solid fa-filter"></i>
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Filtered Renderers</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Only these renderers are active:
                        <span class="font-mono">
                            paragraph, heading, text, strong, em, link, list, listitem, codespan
                        </span>. Code blocks, tables, blockquotes, and horizontal rules are
                        disabled.
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <!-- Rendered Content -->
    <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
        <div class="prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown source={sampleMarkdown} renderers={customRenderers} />
        </div>
    </div>
</div>
