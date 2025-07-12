<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import RawText from '$lib/test/deep-variables/RawText.svelte'

    let source = '#&nbsp;Hello You are amazing!!! :D '
    const renderers = {
        rawtext: RawText
    }
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview">
        <SvelteMarkdown {source} {renderers} someDeepVariable={{ text: 'Hello Deep Variable' }} />
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
