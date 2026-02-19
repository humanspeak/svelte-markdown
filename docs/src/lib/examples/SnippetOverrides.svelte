<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const sampleMarkdown = `# Snippet Overrides Demo

## Inline Customization

Svelte 5 snippets let you **customize rendering** directly in your template. No separate files needed for simple tweaks.

### Key Benefits

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

    let mode: 'default' | 'snippets' = $state('default')
</script>

<div class="mx-auto w-full max-w-4xl p-4">
    <!-- Header -->
    <div class="mb-6">
        <h2 class="text-foreground text-2xl font-bold">Snippet Overrides</h2>
        <p class="text-muted-foreground mt-1 text-sm">
            Toggle between default rendering and snippet-overridden rendering to see how Svelte 5
            snippets customize the output inline.
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
            Default Rendering
        </button>
        <button
            onclick={() => (mode = 'snippets')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'snippets'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            With Snippet Overrides
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
                    <p class="text-foreground text-sm font-medium">Default Rendering</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        All markdown elements use their built-in default renderers with no
                        customization.
                    </p>
                </div>
            </div>
        {:else}
            <div class="flex items-start gap-3">
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-sm text-purple-600"
                >
                    <i class="fa-solid fa-scissors"></i>
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Snippet Overrides Active</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Paragraphs, headings, links, blockquotes, list items, and code blocks are
                        all customized using inline Svelte 5 snippets. Notice the visual
                        differences!
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <!-- Rendered Content -->
    <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
        <div class="prose prose-sm dark:prose-invert max-w-none">
            {#if mode === 'default'}
                <SvelteMarkdown source={sampleMarkdown} />
            {:else}
                <SvelteMarkdown source={sampleMarkdown}>
                    {#snippet paragraph({ children })}
                        <p
                            class="border-brand-200 bg-brand-50/30 dark:border-brand-800 dark:bg-brand-950/20 my-3 rounded-lg border-l-4 py-1 pl-4"
                        >
                            {@render children?.()}
                        </p>
                    {/snippet}

                    {#snippet heading({ depth, children })}
                        <svelte:element
                            this={`h${depth}`}
                            class="text-brand-700 dark:text-brand-400 flex items-center gap-2"
                        >
                            {#if depth === 1}
                                <i class="fa-solid fa-scissors text-sm"></i>
                            {:else if depth === 2}
                                <i class="fa-solid fa-wand-magic-sparkles text-sm"></i>
                            {:else}
                                <i class="fa-solid fa-chevron-right text-xs"></i>
                            {/if}
                            {@render children?.()}
                        </svelte:element>
                    {/snippet}

                    {#snippet link({ href, title, children })}
                        <a
                            {href}
                            {title}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-brand-600 dark:text-brand-400 inline-flex items-center gap-1 font-semibold no-underline hover:underline"
                        >
                            {@render children?.()}
                            <i class="fa-solid fa-arrow-up-right-from-square text-[0.6em]"></i>
                        </a>
                    {/snippet}

                    {#snippet blockquote({ children })}
                        <aside
                            class="my-4 flex gap-3 rounded-r-lg border-l-4 border-amber-400 bg-amber-50 p-4 dark:border-amber-600 dark:bg-amber-950/30"
                            role="note"
                        >
                            <span class="shrink-0 text-amber-500">
                                <i class="fa-solid fa-lightbulb"></i>
                            </span>
                            <div>{@render children?.()}</div>
                        </aside>
                    {/snippet}

                    {#snippet listitem({ children })}
                        <li class="flex items-start gap-2">
                            <span class="text-brand-500 mt-0.5 shrink-0"
                                ><i class="fa-solid fa-check text-xs"></i></span
                            >
                            <div>{@render children?.()}</div>
                        </li>
                    {/snippet}

                    {#snippet code({ lang, text })}
                        <div
                            class="relative my-4 overflow-hidden rounded-lg border border-gray-700"
                        >
                            {#if lang}
                                <div class="bg-brand-600 px-3 py-1 text-xs font-medium text-white">
                                    {lang}
                                </div>
                            {/if}
                            <pre class="overflow-x-auto bg-gray-900 p-4 text-green-400"><code
                                    >{text}</code
                                ></pre>
                        </div>
                    {/snippet}

                    {#snippet tablecell({ header, align, children })}
                        {#if header}
                            <th
                                class="bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-400 px-4 py-2 text-left text-sm font-semibold"
                                style:text-align={align}
                            >
                                {@render children?.()}
                            </th>
                        {:else}
                            <td
                                class="border-t border-gray-200 px-4 py-2 text-sm dark:border-gray-700"
                                style:text-align={align}
                            >
                                {@render children?.()}
                            </td>
                        {/if}
                    {/snippet}
                </SvelteMarkdown>
            {/if}
        </div>
    </div>
</div>
