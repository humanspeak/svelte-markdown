<script lang="ts">
    import { markedKatex } from '$lib/extensions/katex/index.js'
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import katex from 'katex'

    let htmlBody = $state(`# KaTeX via Svelte 5 snippets

Same delimiter coverage as \`/test/katex\`, rendered through snippet
overrides instead of component renderers. Toggle
**singleDollarInline** to see \`$...$\` flip between text and math.

Inline LaTeX style: \\(E = mc^2\\) and \\(a^2 + b^2 = c^2\\).

Block LaTeX style:

\\[
\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}
\\]

Block dollar style (always on):

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

AMS environment:

\\begin{equation}
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
\\end{equation}

Single-dollar inline (gated): the equation $E = mc^2$ and the area
$A = \\pi r^2$ render as math only when the toggle is on.

Currency stays as text either way: $5,000 budget.
`)

    let singleDollarInline = $state(false)

    const extensions = $derived([markedKatex({ singleDollarInline })])
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css"
        crossorigin="anonymous"
    />
</svelte:head>

<div class="toolbar">
    <label>
        <input
            type="checkbox"
            bind:checked={singleDollarInline}
            data-testid="single-dollar-toggle"
        />
        <code>singleDollarInline: {singleDollarInline}</code>
    </label>
</div>

<div class="container">
    <textarea
        bind:value={htmlBody}
        placeholder="Enter markdown with math here"
        data-testid="markdown-input"></textarea>
    <div class="preview" data-testid="preview">
        <SvelteMarkdown {extensions} source={htmlBody}>
            {#snippet inlineKatex(props: { text: string })}
                <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                {@html katex.renderToString(props.text, {
                    throwOnError: false,
                    displayMode: false
                })}
            {/snippet}
            {#snippet blockKatex(props: { text: string })}
                <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                {@html katex.renderToString(props.text, { throwOnError: false, displayMode: true })}
            {/snippet}
        </SvelteMarkdown>
    </div>
</div>

<style>
    .toolbar {
        padding: 0.75rem 1rem 0;
        font-size: 0.875rem;
    }

    .toolbar label {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
    }

    .container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding: 1rem;
    }

    textarea {
        min-height: 300px;
        padding: 0.5rem;
        font-family: monospace;
    }

    .preview {
        padding: 0.5rem;
    }
</style>
