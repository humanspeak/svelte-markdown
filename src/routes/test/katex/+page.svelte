<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import KatexRenderer from '$lib/test/marked_extensions/KatexRenderer.svelte'
    import type { RendererComponent, Renderers } from '$lib/utils/markdown-parser.js'
    import markedKatex from 'marked-katex-extension'

    let htmlBody = $state(`# KaTeX Math Rendering

Inline math: $E = mc^2$ and $\\alpha + \\beta = \\gamma$.

Block math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$

Mixed content with **bold**, *italic*, and inline math $x^2 + y^2 = r^2$.

## Quadratic Formula

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

## Summation

$$
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
$$
`)

    const extensions = [markedKatex({ throwOnError: false })]

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
