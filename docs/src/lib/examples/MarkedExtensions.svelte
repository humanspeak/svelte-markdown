<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import katex from 'katex'
    import markedKatex from 'marked-katex-extension'
    import { createHighlighter } from 'shiki'
    import { onMount } from 'svelte'
    import KatexRenderer from './KatexRenderer.svelte'

    const defaultMarkdown = `# Euler's Identity

The equation $e^{i\\pi} + 1 = 0$ unites five fundamental constants.

## Quadratic Formula

Every quadratic $ax^2 + bx + c = 0$ has solutions:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## Mixed Content

Markdown works alongside math: **bold**, *italic*, and inline $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$.

### Gaussian Integral

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

> **Tip:** Use \`$...$\` for inline math and \`$$...$$\` for block math.

### Matrix Example

$$
\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}
$$`

    let mode: 'component' | 'snippet' = $state('component')
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    const extensions = [markedKatex({ throwOnError: false })]

    interface KatexRenderers extends Renderers {
        inlineKatex: RendererComponent
        blockKatex: RendererComponent
    }

    const renderers: Partial<KatexRenderers> = {
        inlineKatex: KatexRenderer,
        blockKatex: KatexRenderer
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value

        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
            source = input
        }, 500)
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
  import markedKatex from 'marked-katex-extension'
  import KatexRenderer from './KatexRenderer.svelte'

  const renderers = {
    inlineKatex: KatexRenderer,
    blockKatex: KatexRenderer
  }
\x3C/script>

\x3Csvelte:head>
  \x3Clink rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css"
    crossorigin="anonymous" />
\x3C/svelte:head>

\x3CSvelteMarkdown
  source={markdown}
  extensions={[markedKatex({ throwOnError: false })]}
  {renderers}
/>`

    const rendererCode = `\x3C!-- KatexRenderer.svelte -->
\x3Cscript lang="ts">
  import katex from 'katex'

  interface Props {
    text: string
    displayMode?: boolean
  }

  const { text, displayMode = false }: Props = $props()

  const html = $derived(
    katex.renderToString(text, { throwOnError: false, displayMode })
  )
\x3C/script>

{@html html}`

    const snippetCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import katex from 'katex'
  import markedKatex from 'marked-katex-extension'
\x3C/script>

\x3Csvelte:head>
  \x3Clink rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css"
    crossorigin="anonymous" />
\x3C/svelte:head>

\x3CSvelteMarkdown
  source={markdown}
  extensions={[markedKatex({ throwOnError: false })]}
>
  {#snippet inlineKatex(props)}
    {@html katex.renderToString(props.text, { displayMode: false })}
  {/snippet}
  {#snippet blockKatex(props)}
    {@html katex.renderToString(props.text, { displayMode: true })}
  {/snippet}
\x3C/SvelteMarkdown>`

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

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css"
        crossorigin="anonymous"
    />
</svelte:head>

<div class="mx-auto w-full max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h2 class="text-foreground text-2xl font-bold">Marked Extensions</h2>
            <p class="text-muted-foreground mt-1 text-sm">
                Live KaTeX math rendering powered by the <code
                    class="bg-muted text-brand-600 rounded px-1 py-0.5 text-xs">extensions</code
                > prop. Edit the markdown to try your own math expressions.
            </p>
        </div>
        <button
            onclick={reset}
            class="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
            <i class="fa-solid fa-rotate-right text-xs"></i>
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
                    <i class="fa-solid fa-cube"></i>
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Component Renderers</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        A reusable <code class="bg-muted rounded px-1">KatexRenderer.svelte</code>
                        component handles both inline and block math via the
                        <code class="bg-muted rounded px-1">renderers</code> prop. Best for reusable,
                        testable rendering logic.
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
                    <p class="text-foreground text-sm font-medium">Snippet Overrides</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Inline Svelte 5 snippets render math directly in the template via
                        <code class="bg-muted rounded px-1">{'{#snippet inlineKatex}'}</code>. Best
                        for quick, one-off customizations with no extra files.
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
                placeholder="Type markdown with $math$ here..."
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
                {#if mode === 'component'}
                    <SvelteMarkdown {source} {extensions} {renderers} />
                {:else}
                    <SvelteMarkdown {source} {extensions}>
                        {#snippet inlineKatex(props: { text: string })}
                            <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                            {@html katex.renderToString(props.text, {
                                throwOnError: false,
                                displayMode: false
                            })}
                        {/snippet}
                        {#snippet blockKatex(props: { text: string })}
                            <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                            {@html katex.renderToString(props.text, {
                                throwOnError: false,
                                displayMode: true
                            })}
                        {/snippet}
                    </SvelteMarkdown>
                {/if}
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
                            KatexRenderer.svelte
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
