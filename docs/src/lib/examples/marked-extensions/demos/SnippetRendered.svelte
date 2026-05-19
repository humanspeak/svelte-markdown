<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { markedKatex } from '@humanspeak/svelte-markdown/extensions'
    import { DemoSplitV2 } from '@humanspeak/docs-kit'
    import katex from 'katex'

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

> **Tip:** Use \`\\(...\\)\` for inline math and \`\\[...\\]\` for block math. AMS environments work too.

#### AMS environment

\\begin{equation}
\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}
\\end{equation}`

    // Debounced live editor — same pattern as the component variant.
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            source = input
        }, 500)
    }
</script>

<svelte:head>
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css"
        crossorigin="anonymous"
    />
</svelte:head>

<DemoSplitV2 leftLabel="EDITOR" leftTone="markdown" rightLabel="PREVIEW" rightTone="snippets">
    {#snippet left()}
        <textarea
            value={input}
            oninput={handleInput}
            class="me-editor"
            spellcheck="false"
            placeholder="Type markdown with \(inline\) and \[block\] math..."
        ></textarea>
    {/snippet}
    {#snippet right()}
        <div class="me-preview prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown {source} extensions={[markedKatex()]}>
                {#snippet inlineKatex(props: { text: string })}
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX HTML is sanitized by the library itself -->
                    {@html katex.renderToString(props.text, {
                        throwOnError: false,
                        displayMode: false
                    })}
                {/snippet}
                {#snippet blockKatex(props: { text: string })}
                    <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX HTML is sanitized by the library itself -->
                    {@html katex.renderToString(props.text, {
                        throwOnError: false,
                        displayMode: true
                    })}
                {/snippet}
            </SvelteMarkdown>
        </div>
    {/snippet}
</DemoSplitV2>

<style>
    .me-editor {
        width: 100%;
        height: 100%;
        min-height: 360px;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--brut-ink, var(--foreground, inherit));
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.7;
        padding: 0;
    }
    .me-preview {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2, var(--muted-foreground, inherit));
    }
    .me-preview :global(h1),
    .me-preview :global(h2),
    .me-preview :global(h3),
    .me-preview :global(h4) {
        color: var(--brut-ink, var(--foreground, inherit));
        letter-spacing: -0.02em;
    }
    .me-preview :global(code) {
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.08));
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.18));
        padding: 0 4px;
        font-size: 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .me-preview :global(blockquote) {
        border-left: 2px solid var(--brut-accent);
        padding-left: 12px;
        font-style: italic;
        color: var(--brut-ink-2);
    }
</style>
