<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import katex from 'katex'
    import markedKatex from 'marked-katex-extension'

    let htmlBody = $state(`Inline math: $E = mc^2$ and block math:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$
`)

    const extensions = [markedKatex({ throwOnError: false })]
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
