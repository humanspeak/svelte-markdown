<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { createHighlighter } from 'shiki'
    import { onMount } from 'svelte'
    import { Heading, Link, Scissors } from '@lucide/svelte'

    const sampleMarkdown = `## Linked Headings Demo

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

    let mode: 'default' | 'snippet' | 'renderer' = $state('default')

    const snippetCode = `\x3Cscript>
  import SvelteMarkdown from '@humanspeak/svelte-markdown'

  const source = '## Getting Started\\nSome intro text.'
\x3C/script>

\x3CSvelteMarkdown {source}>
  {#snippet heading({ depth, text, slug, options, children })}
    {@const id = options.headerIds
      ? options.headerPrefix + slug(text)
      : undefined}
    \x3Csvelte:element this="h{depth}" {id} class="group relative">
      {@render children?.()}
      {#if id}
        \x3Ca
          href="#{id}"
          class="ml-2 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Link to {text}"
        >
          #
        \x3C/a>
      {/if}
    \x3C/svelte:element>
  {/snippet}
\x3C/SvelteMarkdown>`

    const rendererCode = `\x3C!-- LinkedHeading.svelte -->
\x3Cscript lang="ts">
  import type { Snippet } from 'svelte'
  import type { SvelteMarkdownOptions }
    from '@humanspeak/svelte-markdown'

  interface Props {
    depth: number
    raw: string
    text: string
    options: SvelteMarkdownOptions
    slug: (val: string) => string
    children?: Snippet
  }

  const { depth, text, options, slug, children }: Props = $props()
  const id = $derived(
    options.headerIds
      ? options.headerPrefix + slug(text)
      : undefined
  )
\x3C/script>

\x3Csvelte:element this="h{depth}" {id} class="group relative">
  \x3Ca href={id ? \`#\${id}\` : undefined}
     class="no-underline hover:underline text-inherit">
    {@render children?.()}
    {#if id}
      \x3Cspan class="ml-2 text-[0.7em] opacity-0 group-hover:opacity-100 transition-opacity">
        🔗
      \x3C/span>
    {/if}
  \x3C/a>
\x3C/svelte:element>`

    const rendererUsageCode = `\x3Cscript>
  ${'import'} SvelteMarkdown from '@humanspeak/svelte-markdown'
  ${'import'} LinkedHeading from './LinkedHeading.svelte'

  const source = '## Getting Started\\nSome intro text.'
\x3C/script>

\x3CSvelteMarkdown
  {source}
  renderers={{ heading: LinkedHeading }}
/>`

    let highlightedSnippet = $state('')
    let highlightedRenderer = $state('')
    let highlightedRendererUsage = $state('')

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

        highlightedSnippet = highlight(snippetCode)
        highlightedRenderer = highlight(rendererCode)
        highlightedRendererUsage = highlight(rendererUsageCode)
    })
</script>

<div class="mx-auto w-full max-w-4xl p-4">
    <!-- Header -->
    <div class="mb-6">
        <h2 class="text-foreground text-2xl font-bold">Linked Headings</h2>
        <p class="text-muted-foreground mt-1 text-sm">
            Toggle between rendering modes to see how to add clickable anchor links to headings.
            Hover over headings in the snippet and renderer modes to reveal the link.
        </p>
    </div>

    <!-- Mode Toggle -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
        <button
            onclick={() => (mode = 'default')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'default'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Default
        </button>
        <button
            onclick={() => (mode = 'renderer')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'renderer'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Custom Renderer
        </button>
        <button
            onclick={() => (mode = 'snippet')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'snippet'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Snippet Override
        </button>
    </div>

    <!-- Info Banner -->
    <div class="border-border bg-card mb-6 rounded-xl border p-4 shadow-sm">
        {#if mode === 'default'}
            <div class="flex items-start gap-3">
                <div
                    class="bg-brand-500/10 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                >
                    <Heading class="size-4" />
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Default Headings</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Plain headings with <code class="bg-muted rounded px-1 py-0.5">id</code>
                        attributes but no visible anchor links. Users can't easily copy a link to a specific
                        section.
                    </p>
                </div>
            </div>
        {:else if mode === 'renderer'}
            <div class="flex items-start gap-3">
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-sm text-emerald-600"
                >
                    <Link class="size-4" />
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Custom Renderer</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Uses
                        <code class="bg-muted rounded px-1 py-0.5"
                            >{'renderers={{ heading: LinkedHeading }}'}</code
                        >
                        with a dedicated component. Best for reuse across pages.
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
                    <p class="text-foreground text-sm font-medium">Snippet Override</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Uses an inline
                        <code class="bg-muted rounded px-1 py-0.5">{'{#snippet heading(...)}'}</code
                        >
                        to add a hover-reveal <code class="bg-muted rounded px-1 py-0.5">#</code>
                        link after each heading. Best for one-off usage.
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <!-- Rendered Content -->
    <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
        <div class="mb-3">
            <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">Preview</h3>
        </div>
        <div class="prose prose-sm dark:prose-invert max-w-none">
            {#if mode === 'default'}
                <SvelteMarkdown source={sampleMarkdown} />
            {:else if mode === 'renderer'}
                <SvelteMarkdown source={sampleMarkdown}>
                    {#snippet heading({ depth, text, slug, options, children })}
                        {@const id = options.headerIds
                            ? options.headerPrefix + slug(text)
                            : undefined}
                        <svelte:element this={`h${depth}`} {id} class="group relative">
                            <a
                                href={id ? `#${id}` : undefined}
                                class="text-inherit no-underline hover:underline"
                            >
                                {@render children?.()}
                                {#if id}
                                    <span
                                        class="text-brand-500 ml-2 text-[0.7em] opacity-0 transition-opacity group-hover:opacity-100"
                                    >
                                        <Link class="inline size-3.5" />
                                    </span>
                                {/if}
                            </a>
                        </svelte:element>
                    {/snippet}
                </SvelteMarkdown>
            {:else}
                <SvelteMarkdown source={sampleMarkdown}>
                    {#snippet heading({ depth, text, slug, options, children })}
                        {@const id = options.headerIds
                            ? options.headerPrefix + slug(text)
                            : undefined}
                        <svelte:element this={`h${depth}`} {id} class="group relative">
                            {@render children?.()}
                            {#if id}
                                <a
                                    href="#{id}"
                                    class="text-brand-500 ml-2 no-underline opacity-0 transition-opacity group-hover:opacity-100"
                                    aria-label="Link to {text}"
                                >
                                    #
                                </a>
                            {/if}
                        </svelte:element>
                    {/snippet}
                </SvelteMarkdown>
            {/if}
        </div>
    </div>

    <!-- Code Reference -->
    {#if mode !== 'default'}
        <div class="border-border bg-card mt-6 rounded-xl border p-6 shadow-sm">
            <h3 class="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
                {mode === 'renderer' ? 'Custom Renderer' : 'Snippet Override'} Code
            </h3>
            <div class="prose prose-sm dark:prose-invert max-w-none">
                {#if mode === 'renderer'}
                    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        <div>
                            <p
                                class="text-muted-foreground not-prose mb-2 text-xs font-medium uppercase"
                            >
                                Usage
                            </p>
                            {#if highlightedRendererUsage}
                                <div class="shiki-container">
                                    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                                    {@html highlightedRendererUsage}
                                </div>
                            {:else}
                                <pre
                                    class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                                        class="text-foreground">{rendererUsageCode}</code
                                    ></pre>
                            {/if}
                        </div>
                        <div>
                            <p
                                class="text-muted-foreground not-prose mb-2 text-xs font-medium uppercase"
                            >
                                LinkedHeading.svelte
                            </p>
                            {#if highlightedRenderer}
                                <div class="shiki-container">
                                    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                                    {@html highlightedRenderer}
                                </div>
                            {:else}
                                <pre
                                    class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
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
    {/if}
</div>
