<script lang="ts">
    import { KatexRenderer, markedKatex } from '$lib/extensions/katex/index.js'
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { RendererComponent, Renderers } from '$lib/utils/markdown-parser.js'

    // Mirrors the genai/www config exactly — singleDollarInline: true so the
    // LLM's existing $...$ / $$...$$ output keeps rendering during the
    // migration off marked-katex-extension. This page is a regression
    // playground for the exact dataverse-style transcript that exposed the
    // boundary edge cases (currency-vs-math, $0$), inline $$...$$, etc.).
    const extensions = [markedKatex({ singleDollarInline: true })]

    interface KatexRenderers extends Renderers {
        inlineKatex: RendererComponent
        blockKatex: RendererComponent
    }

    const renderers: Partial<KatexRenderers> = {
        inlineKatex: KatexRenderer,
        blockKatex: KatexRenderer
    }

    // String.raw keeps backslashes literal — no double-escape gymnastics for
    // \frac, \pm, \sqrt, etc. The exact text the user pasted, verbatim.
    const dataverseSource = String.raw`That question is outside the scope of this dataverse — I'm focused on helping you analyze the transaction data (Amjad, Farhad, categories, etc.), not general math reference.

For completeness, though:

### Quadratic Formula
For $ax^2 + bx + c = 0$ (with $a \neq 0$):

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

The discriminant $b^2 - 4ac$ tells you the nature of the roots: positive = two real roots, zero = one repeated root, negative = two complex conjugate roots.

### Euler's Identity

$$e^{i\pi} + 1 = 0$$

A special case of Euler's formula $e^{ix} = \cos(x) + i\sin(x)$ evaluated at $x = \pi$. Often cited as the most elegant equation in mathematics because it links five fundamental constants ($e$, $i$, $\pi$, $1$, $0$) and three core operations (addition, multiplication, exponentiation) in a single expression.

Back to the analysis whenever you're ready.

- Can you run the logistic regression of Amjad on hour, category, and amount?
- Can you build the card-level features for a cardholder Amjad model?
- Can you run the quantile regression on Amjad amount at the 95th percentile?`

    // Each fragment is also surfaced individually so Playwright can target a
    // specific delimiter form without the rest of the prose interfering.
    const fragments: { id: string; label: string; markdown: string }[] = [
        {
            id: 'inline-quadratic-form',
            label: 'Inline $ax^2 + bx + c = 0$ followed by " (with"',
            markdown: 'For $ax^2 + bx + c = 0$ (with $a \\neq 0$):'
        },
        {
            id: 'block-quadratic-formula',
            label: 'Single-line $$ ... $$ block (no own-line delimiters)',
            markdown: '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'
        },
        {
            id: 'block-quadratic-formula-ownline',
            label: 'Own-line $$ ... $$ block (delimiters on their own lines)',
            markdown: '$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$'
        },
        {
            id: 'block-euler',
            label: 'Single-line $$e^{i\\pi} + 1 = 0$$',
            markdown: '$$e^{i\\pi} + 1 = 0$$'
        },
        {
            id: 'inline-discriminant',
            label: 'Inline $b^2 - 4ac$ in mid-sentence',
            markdown: 'The discriminant $b^2 - 4ac$ tells you...'
        },
        {
            id: 'inline-paren-list',
            label: 'Parenthetical with trailing $0$) — closing $ before )',
            markdown: 'links five constants ($e$, $i$, $\\pi$, $1$, $0$) and three operations'
        },
        {
            id: 'inline-currency',
            label: 'Currency strings (must NOT render as math)',
            markdown: 'Budget: $5,000 across $42 line items.'
        },
        {
            id: 'inline-latex-paren',
            label: 'LaTeX-style \\(...\\) inline',
            markdown: 'The Pythagorean identity is \\(\\sin^2 \\theta + \\cos^2 \\theta = 1\\).'
        },
        {
            id: 'block-latex-bracket',
            label: 'LaTeX-style \\[ ... \\] block (own-line delimiters)',
            markdown: '\\[\n\\int_{-\\infty}^{\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}\n\\]'
        },
        {
            id: 'block-ams-equation',
            label: 'AMS \\begin{equation} ... \\end{equation}',
            markdown:
                '\\begin{equation}\n\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}\n\\end{equation}'
        }
    ]
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css"
        crossorigin="anonymous"
    />
</svelte:head>

<header data-testid="header">
    <h1>KaTeX delimiter regression playground</h1>
    <p>
        Mirrors the <code>genai/www</code> config (<code>singleDollarInline: true</code>). Each
        fragment below is a known edge case from the dataverse transcript.
    </p>
</header>

<section data-testid="full-transcript-section">
    <h2>Full transcript (verbatim from the failing message)</h2>
    <div class="preview" data-testid="full-transcript-preview">
        <SvelteMarkdown {extensions} source={dataverseSource} {renderers} />
    </div>
</section>

<section data-testid="fragments-section">
    <h2>Isolated fragments</h2>
    <p>One fragment per row so Playwright can scope assertions to a specific delimiter form.</p>
    <div class="fragments">
        {#each fragments as fragment (fragment.id)}
            <article class="fragment" data-testid="fragment-{fragment.id}">
                <header>
                    <code class="fragment-id">{fragment.id}</code>
                    <span class="fragment-label">{fragment.label}</span>
                </header>
                <details class="fragment-source">
                    <summary>Source</summary>
                    <pre data-testid="fragment-{fragment.id}-source">{fragment.markdown}</pre>
                </details>
                <div class="fragment-rendered" data-testid="fragment-{fragment.id}-rendered">
                    <SvelteMarkdown {extensions} source={fragment.markdown} {renderers} />
                </div>
            </article>
        {/each}
    </div>
</section>

<style>
    :global(body) {
        font-family:
            system-ui,
            -apple-system,
            sans-serif;
        max-width: 960px;
        margin: 0 auto;
        padding: 1.5rem;
        line-height: 1.5;
    }

    header[data-testid='header'] h1 {
        margin: 0 0 0.5rem;
    }

    header[data-testid='header'] p {
        color: #555;
        margin: 0 0 1.5rem;
    }

    section {
        margin-top: 2rem;
        padding: 1rem 1.25rem;
        border: 1px solid #ddd;
        border-radius: 0.5rem;
    }

    section > h2 {
        margin-top: 0;
    }

    .preview {
        border: 1px solid #eee;
        border-radius: 0.375rem;
        padding: 1rem;
        background: #fafafa;
    }

    .fragments {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .fragment {
        border: 1px solid #eee;
        border-radius: 0.375rem;
        padding: 0.75rem 1rem;
    }

    .fragment > header {
        display: flex;
        gap: 0.75rem;
        align-items: baseline;
        margin-bottom: 0.5rem;
    }

    .fragment-id {
        font-size: 0.75rem;
        color: #666;
        background: #f0f0f0;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
    }

    .fragment-label {
        font-size: 0.875rem;
        color: #333;
    }

    .fragment-source pre {
        font-size: 0.75rem;
        background: #f5f5f5;
        padding: 0.5rem 0.75rem;
        border-radius: 0.25rem;
        overflow-x: auto;
        margin: 0.5rem 0;
        white-space: pre-wrap;
    }

    .fragment-rendered {
        padding: 0.5rem 0;
        border-top: 1px dashed #eee;
    }
</style>
