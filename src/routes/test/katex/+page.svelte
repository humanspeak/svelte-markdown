<script lang="ts">
    import { KatexRenderer, markedKatex } from '$lib/extensions/katex/index.js'
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { RendererComponent, Renderers } from '$lib/utils/markdown-parser.js'

    let htmlBody = $state(`# KaTeX Math Rendering

Each delimiter form below is parsed by \`markedKatex\` from
\`@humanspeak/svelte-markdown/extensions\`. Toggle the
**singleDollarInline** option to see how \`$...$\` behaves in both modes.

## 1. \\\\(...\\\\) inline (LaTeX style)

The Pythagorean identity is \\(\\sin^2 \\theta + \\cos^2 \\theta = 1\\),
and Euler's relation states \\(e^{i\\pi} + 1 = 0\\).

## 2. \\\\[...\\\\] block (LaTeX style)

\\[
\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
\\]

## 3. $$...$$ block (always on)

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## 4. AMS environments

\\begin{equation}
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
\\end{equation}

\\begin{align}
a &= b + c \\\\
   &= d + e
\\end{align}

## 5. $...$ inline — gated by singleDollarInline

Einstein's mass-energy equivalence is $E = mc^2$, and the area of a
circle is $A = \\pi r^2$. With **singleDollarInline off** (default)
these render as plain text; with it **on**, they render as math.

## 6. Currency strings — stay as text in both modes

Even with \`singleDollarInline: true\`, the whitespace-bounded rule
keeps currency strings intact. A price like $5,000 or "the cost is
$5" must render as plain text either way.
`)

    let singleDollarInline = $state(false)

    const extensions = $derived([markedKatex({ singleDollarInline })])

    interface KatexRenderers extends Renderers {
        inlineKatex: RendererComponent
        blockKatex: RendererComponent
    }

    const renderers: Partial<KatexRenderers> = {
        inlineKatex: KatexRenderer,
        blockKatex: KatexRenderer
    }
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.28/dist/katex.min.css"
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
        data-testid="markdown-input"
    ></textarea>
    <div class="preview" data-testid="preview">
        <SvelteMarkdown {extensions} source={htmlBody} {renderers} />
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
