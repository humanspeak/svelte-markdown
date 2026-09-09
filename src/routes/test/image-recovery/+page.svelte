<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { onMount } from 'svelte'

    const INITIAL_IMAGE_URL = '/test-image-150.png'
    const ALTERNATE_IMAGE_URL = '/test-image-50.png'
    const BROKEN_IMAGE_URL = '/missing-image-recovery-demo.png'
    const APPENDED_PROSE = 'This paragraph was appended without changing the image URL.'

    let currentImageUrl = $state(INITIAL_IMAGE_URL)
    let hasAppendedProse = $state(false)
    let hydrated = $state(false)

    const source = $derived(
        `![Recovery target](${currentImageUrl} "Image recovery target")${
            hasAppendedProse ? `\n\n${APPENDED_PROSE}` : ''
        }`
    )

    const reset = () => {
        currentImageUrl = INITIAL_IMAGE_URL
        hasAppendedProse = false
    }

    onMount(() => {
        hydrated = true
    })
</script>

<svelte:head>
    <title>Image recovery demonstration</title>
</svelte:head>

<main class="page" data-testid="image-recovery-page" data-hydrated={hydrated ? 'true' : 'false'}>
    <header>
        <p class="eyebrow">Developer demonstration</p>
        <h1>Image recovery after a failed source</h1>
        <p class="intro">
            Previously, a failed image attempt could leave stale error state behind when the same
            markdown image token received a valid URL. Use the controls to break and recover the
            real renderer. The recovered image should load normally; appending prose should keep the
            existing image DOM node because its URL did not change.
        </p>
        <a href="/test/footnote-correctness">Open the footnote correctness demo</a>
    </header>

    <section class="controls" aria-labelledby="image-controls-heading">
        <h2 id="image-controls-heading">Recovery controls</h2>
        <div class="button-row">
            <button
                type="button"
                onclick={() => (currentImageUrl = BROKEN_IMAGE_URL)}
                disabled={!hydrated}
            >
                Load broken image
            </button>
            <button
                type="button"
                onclick={() => (currentImageUrl = INITIAL_IMAGE_URL)}
                disabled={!hydrated}
            >
                Recover with valid image
            </button>
            <button
                type="button"
                onclick={() => (currentImageUrl = ALTERNATE_IMAGE_URL)}
                disabled={!hydrated}
            >
                Switch valid image
            </button>
            <button type="button" onclick={() => (hasAppendedProse = true)} disabled={!hydrated}>
                Append prose
            </button>
            <button type="button" onclick={reset} disabled={!hydrated}>Reset</button>
        </div>
        <p class="current-value">
            <span id="current-image-label">Current image URL:</span>
            <output aria-labelledby="current-image-label" data-testid="current-image-url">
                {currentImageUrl}
            </output>
        </p>
        <p class="expectation">
            Expected sequence: the missing URL produces the renderer's real error styling, either
            local PNG recovers to a loaded image, and prose appears without replacing an unchanged
            image.
        </p>
    </section>

    <div class="comparison">
        <section class="panel" aria-labelledby="image-source-heading">
            <h2 id="image-source-heading">Markdown source</h2>
            <pre data-testid="image-source">{source}</pre>
        </section>

        <section class="panel" aria-labelledby="image-preview-heading">
            <h2 id="image-preview-heading">Rendered output</h2>
            <div class="preview" data-testid="image-preview">
                <SvelteMarkdown {source} />
            </div>
        </section>
    </div>
</main>

<style>
    .page {
        width: min(1120px, calc(100% - 2rem));
        min-height: calc(100vh - 6.5rem);
        margin: 0 auto;
        padding: 2.5rem 0 4rem;
        background: #f5f7fb;
        color: #172033;
        font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            'Segoe UI',
            sans-serif;
    }

    header,
    .controls,
    .panel {
        border: 1px solid #d7deea;
        border-radius: 0.9rem;
        background: white;
        box-shadow: 0 0.5rem 1.5rem rgb(23 32 51 / 7%);
    }

    header,
    .controls {
        padding: clamp(1.25rem, 3vw, 2rem);
        margin-bottom: 1.25rem;
    }

    h1,
    h2,
    p {
        margin-top: 0;
    }

    h1 {
        margin-bottom: 0.75rem;
        font-size: clamp(2rem, 5vw, 3.25rem);
        line-height: 1.05;
    }

    h2 {
        font-size: 1.1rem;
    }

    .eyebrow {
        margin-bottom: 0.5rem;
        color: #4c5fc5;
        font-size: 0.8rem;
        font-weight: 750;
        letter-spacing: 0.09em;
        text-transform: uppercase;
    }

    .intro,
    .expectation {
        max-width: 76ch;
        line-height: 1.65;
    }

    a {
        color: #3549b9;
        font-weight: 650;
    }

    .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        margin-bottom: 1rem;
    }

    button {
        min-height: 2.75rem;
        padding: 0.65rem 0.9rem;
        border: 1px solid #9da8bd;
        border-radius: 0.55rem;
        background: #f8f9fc;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-weight: 650;
    }

    button:hover {
        background: #edf0fa;
    }

    button:focus-visible,
    a:focus-visible {
        outline: 3px solid #8090ed;
        outline-offset: 3px;
    }

    .current-value {
        display: flex;
        flex-wrap: wrap;
        gap: 0.45rem;
        margin-bottom: 0.7rem;
        font-weight: 650;
    }

    output {
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }

    .expectation {
        margin-bottom: 0;
        color: #4b5568;
    }

    .comparison {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 1.25rem;
    }

    .panel {
        min-width: 0;
        padding: 1.25rem;
    }

    pre,
    .preview {
        min-height: 18rem;
        margin: 0;
        padding: 1rem;
        overflow: auto;
        border: 1px solid #dce2ed;
        border-radius: 0.65rem;
        background: #f8fafc;
    }

    pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
    }

    .preview {
        display: grid;
        align-content: start;
        justify-items: start;
    }

    .preview :global(img) {
        display: block;
        min-width: 50px;
        min-height: 50px;
        border-radius: 0.35rem;
    }

    @media (max-width: 760px) {
        .page {
            width: min(100% - 1rem, 42rem);
            padding-top: 0.5rem;
        }

        .comparison {
            grid-template-columns: 1fr;
        }

        pre,
        .preview {
            min-height: 12rem;
        }

        button {
            flex: 1 1 12rem;
        }
    }
</style>
