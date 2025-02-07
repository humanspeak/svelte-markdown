<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import Div from '$lib/test/Div.svelte'

    let source = '# Hello'
    const renderers = {
        html: {
            div: Div
        }
    }
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview">
        <SvelteMarkdown {source} {renderers} />
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
        min-height: 200px;
        padding: 0.5rem;
    }

    .preview {
        padding: 0.5rem;
    }
</style>
