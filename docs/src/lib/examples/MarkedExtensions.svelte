<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { KatexRenderer, markedKatex } from '@humanspeak/svelte-markdown/extensions'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import katex from 'katex'
    import { createHighlighter } from 'shiki'
    import { onMount } from 'svelte'
    import { Box, DollarSign, RotateCw, Scissors } from '@lucide/svelte'

    const defaultMarkdown = `## Euler's Identity

The equation \\(e^{i\\pi} + 1 = 0\\) unites five fundamental constants.

### Quadratic Formula

Every quadratic \\(ax^2 + bx + c = 0\\) has solutions:

\\[
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\]

### Mixed Content

Markdown works alongside math: **bold**, *italic*, and inline \\(\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}\\).

#### Gaussian Integral

\\[
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
\\]

> **Tip:** Use \`\\(...\\)\` for inline math and \`\\[...\\]\` (or \`$$...$$\`) for block math. AMS environments work too.

#### AMS environment

\\begin{equation}
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
\\end{equation}

#### Matrix Example

$$
\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix} \\begin{pmatrix} x \\\\ y \\end{pmatrix} = \\begin{pmatrix} ax + by \\\\ cx + dy \\end{pmatrix}
$$

#### Single-dollar inline (gated by \`singleDollarInline\`)

Toggle the **$ inline** switch above to see how \`$...$\` behaves.

Einstein's mass-energy equivalence is $E = mc^2$, and the area of a
circle is $A = \\pi r^2$. With the option **off** (default) these
render as plain text; with it **on**, they render as math.

Currency strings stay as text either way — a price like $5,000 or
"the cost is $5" never matches the math rule.`

    let mode: 'component' | 'snippet' = $state('component')
    let singleDollarInline = $state(false)
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    const extensions = $derived([markedKatex({ singleDollarInline })])

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
        singleDollarInline = false
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
    }

    const componentCodeBase = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { markedKatex, KatexRenderer } from '@humanspeak/svelte-markdown/extensions'

  const source = "Euler: \\\\(e^{i\\\\pi} + 1 = 0\\\\)"
  const renderers = {
    inlineKatex: KatexRenderer,
    blockKatex: KatexRenderer
  }
\x3C/script>

\x3Csvelte:head>
  \x3Clink rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css"
    crossorigin="anonymous" />
\x3C/svelte:head>`

    const componentCode = $derived(
        `${componentCodeBase}

\x3CSvelteMarkdown
  {source}
  extensions={[markedKatex(${singleDollarInline ? '{ singleDollarInline: true }' : ''})]}
  {renderers}
/>`
    )

    const rendererCode = `// Built-in component re-exported as a convenience —
// equivalent to writing your own KatexRenderer.svelte:

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

    const snippetCodeBase = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { markedKatex } from '@humanspeak/svelte-markdown/extensions'
  import katex from 'katex'

  const source = "Euler: \\\\(e^{i\\\\pi} + 1 = 0\\\\)"
\x3C/script>

\x3Csvelte:head>
  \x3Clink rel="stylesheet"
    href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css"
    crossorigin="anonymous" />
\x3C/svelte:head>`

    const snippetCode = $derived(
        `${snippetCodeBase}

\x3CSvelteMarkdown
  {source}
  extensions={[markedKatex(${singleDollarInline ? '{ singleDollarInline: true }' : ''})]}
>
  {#snippet inlineKatex(props)}
    {@html katex.renderToString(props.text, { throwOnError: false, displayMode: false })}
  {/snippet}
  {#snippet blockKatex(props)}
    {@html katex.renderToString(props.text, { throwOnError: false, displayMode: true })}
  {/snippet}
\x3C/SvelteMarkdown>`
    )

    let highlighter = $state<Awaited<ReturnType<typeof createHighlighter>> | null>(null)

    onMount(async () => {
        highlighter = await createHighlighter({
            themes: ['github-light', 'one-dark-pro'],
            langs: ['svelte']
        })
    })

    // Shiki dual-theme highlighting is ~100ms per call; cache by code string
    // so the toggle only pays the cost once per (code, option) combination.
    // trunk-ignore(eslint/svelte/prefer-svelte-reactivity): plain memo cache, no reactivity needed
    const highlightCache = new Map<string, string>()

    function highlight(code: string): string {
        if (!highlighter) return ''
        const hit = highlightCache.get(code)
        if (hit !== undefined) return hit
        const light = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'github-light' })
        const dark = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'one-dark-pro' })
        const result = `<div class="shiki-light">${light}</div><div class="shiki-dark">${dark}</div>`
        highlightCache.set(code, result)
        return result
    }

    const highlightedComponent = $derived(highlight(componentCode))
    const highlightedRenderer = $derived(highlight(rendererCode))
    const highlightedSnippet = $derived(highlight(snippetCode))
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
            <RotateCw class="size-3" />
            Reset
        </button>
    </div>

    <!-- Mode Toggle + singleDollarInline -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
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
        <label
            class="border-border bg-card text-muted-foreground hover:text-foreground inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        >
            <input type="checkbox" bind:checked={singleDollarInline} class="cursor-pointer" />
            <DollarSign class="size-3" />
            <code class="bg-muted rounded px-1 py-0.5 text-xs"
                >singleDollarInline: {singleDollarInline}</code
            >
        </label>
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
                        The built-in <code class="bg-muted rounded px-1">KatexRenderer</code>
                        from
                        <code class="bg-muted rounded px-1"
                            >@humanspeak/svelte-markdown/extensions</code
                        >
                        handles both inline and block math via the
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
                    <Scissors class="size-4" />
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
                placeholder="Type markdown with \(math\) here..."
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
                            Built-in KatexRenderer
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
