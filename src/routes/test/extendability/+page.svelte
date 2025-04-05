<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import A from '$lib/test/extendability/A.svelte'
    import Div from '$lib/test/extendability/Div.svelte'
    import H1 from '$lib/test/extendability/H1.svelte'
    import RawText from '$lib/test/extendability/RawText.svelte'

    let source = '#&nbsp;Hello'
    const renderers = {
        html: {
            div: Div,
            h1: H1,
            a: A
        },
        rawtext: RawText
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
