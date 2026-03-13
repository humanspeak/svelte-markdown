<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import {
        markedFootnote,
        FootnoteRef,
        FootnoteSection
    } from '@humanspeak/svelte-markdown/extensions'
    import { createHighlighter } from 'shiki'
    import { onMount } from 'svelte'
    import { RotateCw, Box, Scissors } from '@lucide/svelte'

    const defaultMarkdown = `## Footnotes

Footnotes let you add references without cluttering the main text.

Here is a statement[^1] that needs a citation. You can also use named footnotes[^note] for clarity.

Multiple references[^2] can appear throughout the document, and they all link to the definitions at the bottom.

### Technical Writing

When documenting APIs, footnotes[^api] help explain edge cases without breaking the flow of the main content.

[^1]: This is the first footnote with a numeric identifier.
[^note]: Named footnotes use descriptive identifiers instead of numbers.
[^2]: Multiple footnotes are collected into a single section at the end.
[^api]: API footnotes can reference external documentation or implementation details.`

    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    const extensions = [markedFootnote()]

    interface FootnoteRenderers extends Renderers {
        footnoteRef: RendererComponent
        footnoteSection: RendererComponent
    }

    const renderers: Partial<FootnoteRenderers> = {
        footnoteRef: FootnoteRef,
        footnoteSection: FootnoteSection
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value

        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
            source = input
        }, 300)
    }

    function reset() {
        input = defaultMarkdown
        source = defaultMarkdown
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
    }

    const componentCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import type { RendererComponent, Renderers }
    from '@humanspeak/svelte-markdown'
  import {
    markedFootnote, FootnoteRef, FootnoteSection
  } from '@humanspeak/svelte-markdown/extensions'

  const source = 'A statement[^1] with a citation.\\n\\n[^1]: The citation.'

  interface FootnoteRenderers extends Renderers {
    footnoteRef: RendererComponent
    footnoteSection: RendererComponent
  }

  const renderers: Partial\x3CFootnoteRenderers> = {
    footnoteRef: FootnoteRef,
    footnoteSection: FootnoteSection
  }
\x3C/script>

\x3CSvelteMarkdown
  {source}
  extensions={[markedFootnote()]}
  {renderers}
/>`

    const rendererCode = `\x3C!-- FootnoteRef.svelte (built-in) -->
\x3Cscript lang="ts">
  interface Props { id: string }
  const { id }: Props = $props()
\x3C/script>

\x3Csup class="footnote-ref">
  \x3Ca href="#fn-{id}" id="fnref-{id}">{id}\x3C/a>
\x3C/sup>

\x3C!-- FootnoteSection.svelte (built-in) -->
\x3Cscript lang="ts">
  interface Footnote { id: string; text: string }
  interface Props { footnotes: Footnote[] }
  const { footnotes }: Props = $props()
\x3C/script>

\x3Csection class="footnotes" role="doc-endnotes">
  \x3Col>
    {#each footnotes as { id, text } (id)}
      \x3Cli id="fn-{id}">
        \x3Cp>
          {text}
          \x3Ca href="#fnref-{id}"
             class="footnote-backref">↩\x3C/a>
        \x3C/p>
      \x3C/li>
    {/each}
  \x3C/ol>
\x3C/section>`

    const snippetCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { markedFootnote }
    from '@humanspeak/svelte-markdown/extensions'

  const source = 'A statement[^1] with a citation.\\n\\n[^1]: The citation.'
\x3C/script>

\x3CSvelteMarkdown
  {source}
  extensions={[markedFootnote()]}
>
  {#snippet footnoteRef(props)}
    \x3Csup>\x3Ca href="#fn-{props.id}">{props.id}\x3C/a>\x3C/sup>
  {/snippet}

  {#snippet footnoteSection(props)}
    \x3Col>
      {#each props.footnotes as fn}
        \x3Cli id="fn-{fn.id}">
          {fn.text}
          \x3Ca href="#fnref-{fn.id}">↩\x3C/a>
        \x3C/li>
      {/each}
    \x3C/ol>
  {/snippet}
\x3C/SvelteMarkdown>`

    let mode: 'component' | 'snippet' = $state('component')
    let highlightedComponent = $state('')
    let highlightedRenderer = $state('')
    let highlightedSnippet = $state('')

    onMount(async () => {
        const highlighter = await createHighlighter({
            themes: ['github-light', 'one-dark-pro'],
            langs: ['svelte']
        })

        function highlight(code: string): string {
            const light = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'github-light' })
            const dark = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'one-dark-pro' })
            return `<div class="shiki-light">${light}</div><div class="shiki-dark">${dark}</div>`
        }

        highlightedComponent = highlight(componentCode)
        highlightedRenderer = highlight(rendererCode)
        highlightedSnippet = highlight(snippetCode)
    })
</script>

<div class="mx-auto w-full max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h2 class="text-foreground text-2xl font-bold">Footnotes</h2>
            <p class="text-muted-foreground mt-1 text-sm">
                Footnote references and definitions powered by the <code
                    class="bg-muted text-brand-600 rounded px-1 py-0.5 text-xs">markedFootnote</code
                >
                extension. Bidirectional linking between references and definitions.
            </p>
        </div>
        <button
            onclick={reset}
            class="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
            <RotateCw class="size-3" />
            Reset
        </button>
    </div>

    <!-- Mode Toggle -->
    <div class="mb-6 flex items-center gap-3">
        <button
            onclick={() => (mode = 'component')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'component'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Component Renderers
        </button>
        <button
            onclick={() => (mode = 'snippet')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'snippet'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Snippet Overrides
        </button>
    </div>

    <!-- Info Banner -->
    <div class="border-border bg-card mb-6 rounded-xl border p-4 shadow-sm">
        {#if mode === 'component'}
            <div class="flex items-start gap-3">
                <div
                    class="bg-brand-500/10 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                >
                    <Box class="size-4" />
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Component Renderers</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        The built-in <code class="bg-muted rounded px-1">FootnoteRef</code> and
                        <code class="bg-muted rounded px-1">FootnoteSection</code>
                        components render superscript links and a numbered definition list with back-links.
                    </p>
                </div>
            </div>
        {:else}
            <div class="flex items-start gap-3">
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-sm text-purple-600"
                >
                    <Scissors class="size-4" />
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Snippet Overrides</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Use <code class="bg-muted rounded px-1">{'{#snippet footnoteRef}'}</code>
                        and
                        <code class="bg-muted rounded px-1">{'{#snippet footnoteSection}'}</code>
                        to fully customize footnote rendering inline.
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <!-- Split Pane -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Editor -->
        <div class="border-border bg-card flex flex-col rounded-xl border p-6 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
                <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                    Editor
                </h3>
                <span class="text-muted-foreground text-xs">
                    {input.length} characters
                </span>
            </div>
            <textarea
                value={input}
                oninput={handleInput}
                class="border-border bg-background text-foreground focus:ring-brand-500/50 min-h-[500px] w-full flex-1 resize-y rounded-lg border p-4 font-mono text-sm focus:ring-2 focus:outline-none"
                spellcheck="false"
                placeholder="Type markdown with [^id] references and [^id]: definitions..."
            ></textarea>
        </div>

        <!-- Preview -->
        <div class="border-border bg-card flex flex-col rounded-xl border p-6 shadow-sm">
            <div class="mb-3">
                <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                    Preview
                </h3>
            </div>
            <div class="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-auto">
                <SvelteMarkdown {source} {extensions} {renderers} />
            </div>
        </div>
    </div>

    <!-- Code Reference -->
    <div class="border-border bg-card mt-6 rounded-xl border p-6 shadow-sm">
        <h3 class="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            {mode === 'component' ? 'Component Renderer' : 'Snippet Override'} Code
        </h3>
        <div class="prose prose-sm dark:prose-invert max-w-none">
            {#if mode === 'component'}
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                        <p
                            class="text-muted-foreground not-prose mb-2 text-xs font-medium uppercase"
                        >
                            Usage
                        </p>
                        {#if highlightedComponent}
                            <div class="shiki-container">
                                <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                                {@html highlightedComponent}
                            </div>
                        {:else}
                            <pre class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                                    class="text-foreground">{componentCode}</code
                                ></pre>
                        {/if}
                    </div>
                    <div>
                        <p
                            class="text-muted-foreground not-prose mb-2 text-xs font-medium uppercase"
                        >
                            FootnoteRef + FootnoteSection
                        </p>
                        {#if highlightedRenderer}
                            <div class="shiki-container">
                                <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                                {@html highlightedRenderer}
                            </div>
                        {:else}
                            <pre class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                                    class="text-foreground">{rendererCode}</code
                                ></pre>
                        {/if}
                    </div>
                </div>
            {:else if highlightedSnippet}
                <div class="shiki-container">
                    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                    {@html highlightedSnippet}
                </div>
            {:else}
                <pre class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                        class="text-foreground">{snippetCode}</code
                    ></pre>
            {/if}
        </div>
    </div>
</div>

<style>
    :global(.footnote-ref a) {
        color: #539bf5;
        text-decoration: none;
    }
    :global(.footnote-ref a:hover) {
        text-decoration: underline;
    }
    :global(.footnotes) {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid #3d444d;
        font-size: 0.875rem;
    }
    :global(.footnote-backref) {
        color: #539bf5;
        text-decoration: none;
        margin-left: 4px;
    }
    :global(.footnote-backref:hover) {
        text-decoration: underline;
    }
</style>
