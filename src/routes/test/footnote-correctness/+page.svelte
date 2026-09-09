<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { FootnoteRef, FootnoteSection, markedFootnote } from '$lib/extensions/index.js'
    import type { RendererComponent, Renderers, StreamingChunk } from '$lib/index.js'
    import { onDestroy, onMount, tick } from 'svelte'

    interface FootnoteRenderers extends Renderers {
        footnoteRef: RendererComponent
        footnoteSection: RendererComponent
    }

    interface MarkdownHandle {
        writeChunk: (_chunk: StreamingChunk) => void
        resetStream: (_nextSource?: string) => void
    }

    type FixtureKey = 'repeated' | 'duplicate' | 'preserved' | 'special' | 'stream'
    type StaticFixtureKey = Exclude<FixtureKey, 'stream'>

    const fixtureSources: Record<StaticFixtureKey, string> = {
        repeated: `# Repeated references

The first reference points to the shared note[^repeat].

Content between the references remains in place.

The second reference points to that same note[^repeat].

[^repeat]: Shared definition with a return link for each reference.`,
        duplicate: `# Duplicate definitions

This reference uses the first matching definition[^duplicate].

[^duplicate]: First definition wins.
[^duplicate]: Second definition must be ignored.`,
        preserved: `# Content after a definition

This reference has a definition before more document content[^preserved].

[^preserved]: The definition belongs in the footnote section.

Paragraph after the definition remains visible.

## Heading after the definition remains visible`,
        special: `# Special labels

A Unicode label is navigable[^café], and punctuation is safely encoded[^x:2].

[^café]: Definition for the Unicode label.
[^x:2]: Definition for the punctuation label.`
    }

    const fixtureLabels: Record<StaticFixtureKey, string> = {
        repeated: 'Repeated references',
        duplicate: 'Duplicate definitions',
        preserved: 'Following content',
        special: 'Special labels'
    }

    const STREAM_CHUNKS = [
        '# Streaming footnote completion\n\n',
        'The first streamed reference points to a shared note[^stream].\n\n',
        'Text between streamed references remains visible.\n\n',
        'The second streamed reference uses that note too[^stream].\n\n',
        '[^stream]: Shared definition assembled from chunks.\n\n',
        'Streamed paragraph after the definition remains visible.\n\n',
        '## Streamed heading after the definition remains visible'
    ] as const

    const extensions = [markedFootnote()]
    const renderers: Partial<FootnoteRenderers> = {
        footnoteRef: FootnoteRef,
        footnoteSection: FootnoteSection
    }

    let markdown: MarkdownHandle | undefined = $state()
    let selectedFixture: FixtureKey = $state('repeated')
    let source = $state(fixtureSources.repeated)
    let accumulatedSource = $state(fixtureSources.repeated)
    let streaming = $state(false)
    let streamProgress = $state(0)
    let streamState: 'Ready' | 'Streaming' | 'Complete' = $state('Ready')
    let hydrated = $state(false)
    let timer: ReturnType<typeof setTimeout> | undefined
    let streamSession = 0

    const cancelPendingChunk = () => {
        streamSession += 1
        if (timer !== undefined) {
            clearTimeout(timer)
            timer = undefined
        }
    }

    const completeStream = () => {
        if (selectedFixture !== 'stream') return

        cancelPendingChunk()

        for (let index = streamProgress; index < STREAM_CHUNKS.length; index += 1) {
            const chunk = STREAM_CHUNKS[index]
            accumulatedSource += chunk
            markdown?.writeChunk(chunk)
        }

        streamProgress = STREAM_CHUNKS.length
        source = accumulatedSource
        streaming = false
        streamState = 'Complete'
    }

    const scheduleNextChunk = (session: number) => {
        if (session !== streamSession || selectedFixture !== 'stream' || !streaming) return

        if (streamProgress >= STREAM_CHUNKS.length) {
            timer = undefined
            return
        }

        const chunk = STREAM_CHUNKS[streamProgress]
        accumulatedSource += chunk
        markdown?.writeChunk(chunk)
        streamProgress += 1
        timer = setTimeout(() => scheduleNextChunk(session), 140)
    }

    const startStream = async () => {
        cancelPendingChunk()
        const session = streamSession
        selectedFixture = 'stream'
        source = ''
        accumulatedSource = ''
        streamProgress = 0
        streamState = 'Streaming'
        streaming = true

        await tick()
        if (session !== streamSession) return

        markdown?.resetStream('')
        scheduleNextChunk(session)
    }

    const selectFixture = (fixture: StaticFixtureKey) => {
        cancelPendingChunk()
        selectedFixture = fixture
        source = fixtureSources[fixture]
        accumulatedSource = fixtureSources[fixture]
        streamProgress = 0
        streaming = false
        streamState = 'Ready'
    }

    const reset = () => {
        selectFixture('repeated')
    }

    onMount(() => {
        hydrated = true
    })
    onDestroy(cancelPendingChunk)
</script>

<svelte:head>
    <title>Footnote correctness demonstration</title>
</svelte:head>

<main
    class="page"
    data-testid="footnote-correctness-page"
    data-hydrated={hydrated ? 'true' : 'false'}
>
    <header>
        <p class="eyebrow">Developer demonstration</p>
        <h1>Footnote parsing and navigation correctness</h1>
        <p class="intro">
            Earlier behavior could consume normal content after a definition, keep the wrong
            duplicate, or send repeated-reference return links to the wrong place. Choose one real
            markdown document at a time and inspect its IDs, fragment navigation, preserved content,
            and streaming result.
        </p>
        <a href="/test/image-recovery">Open the image recovery demo</a>
    </header>

    <section class="controls" aria-labelledby="fixture-controls-heading">
        <h2 id="fixture-controls-heading">Document controls</h2>
        <div class="button-row" role="group" aria-label="Footnote fixtures">
            {#each Object.entries(fixtureLabels) as [fixture, label] (fixture)}
                <button
                    type="button"
                    aria-pressed={selectedFixture === fixture}
                    onclick={() => selectFixture(fixture as StaticFixtureKey)}
                    disabled={!hydrated}
                >
                    {label}
                </button>
            {/each}
        </div>
        <div class="button-row stream-controls" role="group" aria-label="Streaming controls">
            <button
                type="button"
                onclick={startStream}
                disabled={!hydrated || streamState === 'Streaming'}
            >
                Stream example
            </button>
            <button
                type="button"
                onclick={completeStream}
                disabled={!hydrated || selectedFixture !== 'stream' || streamState === 'Complete'}
            >
                Complete
            </button>
            <button type="button" onclick={reset} disabled={!hydrated}>Reset</button>
        </div>

        <div class="progress-row">
            <progress
                max={STREAM_CHUNKS.length}
                value={streamProgress}
                aria-label="Streaming progress"
            ></progress>
            <output data-testid="stream-progress">
                {streamProgress} / {STREAM_CHUNKS.length} chunks — {streamState}
            </output>
        </div>
        <p class="current-value">
            Selected document:
            <output data-testid="selected-fixture">
                {selectedFixture === 'stream'
                    ? 'Streaming example'
                    : fixtureLabels[selectedFixture]}
            </output>
        </p>
        <p class="expectation">
            Repeated references should have unique IDs and two real return links. Duplicate
            definitions keep the first. A following paragraph and heading remain ordinary output.
            Special labels use safe fragments. Completing a stream keeps every accumulated chunk;
            Reset cancels pending chunks and restores this page's initial document.
        </p>
    </section>

    <div class="comparison">
        <section class="panel" aria-labelledby="footnote-source-heading">
            <h2 id="footnote-source-heading">Markdown source</h2>
            <pre data-testid="footnote-source">{accumulatedSource}</pre>
        </section>

        <section class="panel" aria-labelledby="footnote-preview-heading">
            <h2 id="footnote-preview-heading">Rendered output</h2>
            <div class="preview" data-testid="footnote-preview">
                <SvelteMarkdown
                    bind:this={markdown}
                    {source}
                    {streaming}
                    {extensions}
                    {renderers}
                />
            </div>
        </section>
    </div>
</main>

<style>
    .page {
        width: min(1180px, calc(100% - 2rem));
        min-height: calc(100vh - 7.5rem);
        margin: 0 auto;
        padding: 2.5rem 0 5rem;
        background: #f6f5fb;
        color: #211b35;
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
        border: 1px solid #ddd8e9;
        border-radius: 0.9rem;
        background: white;
        box-shadow: 0 0.5rem 1.5rem rgb(33 27 53 / 7%);
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
        color: #7652b5;
        font-size: 0.8rem;
        font-weight: 750;
        letter-spacing: 0.09em;
        text-transform: uppercase;
    }

    .intro,
    .expectation {
        max-width: 82ch;
        line-height: 1.65;
    }

    a {
        color: #6c42ae;
        font-weight: 650;
    }

    .button-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.65rem;
        margin-bottom: 0.8rem;
    }

    .stream-controls {
        padding-top: 0.8rem;
        border-top: 1px solid #e6e2ef;
    }

    button {
        min-height: 2.75rem;
        padding: 0.65rem 0.9rem;
        border: 1px solid #a79db9;
        border-radius: 0.55rem;
        background: #faf9fc;
        color: inherit;
        cursor: pointer;
        font: inherit;
        font-weight: 650;
    }

    button[aria-pressed='true'] {
        border-color: #6842a6;
        background: #eee7f8;
        color: #4a287e;
    }

    button:disabled {
        cursor: not-allowed;
        opacity: 0.52;
    }

    button:not(:disabled):hover {
        background: #f0ebf7;
    }

    button:focus-visible,
    a:focus-visible {
        outline: 3px solid #a582da;
        outline-offset: 3px;
    }

    .progress-row,
    .current-value {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.65rem;
    }

    .progress-row {
        margin: 1rem 0 0.7rem;
    }

    progress {
        width: min(24rem, 100%);
        height: 1rem;
    }

    output,
    pre {
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }

    .current-value {
        margin-bottom: 0.7rem;
        font-weight: 650;
    }

    .expectation {
        margin-bottom: 0;
        color: #574f67;
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
        min-height: 28rem;
        margin: 0;
        padding: 1rem;
        overflow: auto;
        border: 1px solid #e1ddea;
        border-radius: 0.65rem;
        background: #fbfafd;
    }

    pre {
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        line-height: 1.55;
    }

    .preview {
        line-height: 1.65;
        scroll-padding-block: 3rem;
    }

    .preview :global(.footnote-ref a),
    .preview :global(.footnote-backref) {
        display: inline-flex;
        min-width: 2rem;
        min-height: 2rem;
        align-items: center;
        justify-content: center;
        margin-inline: 0.2rem;
        border-radius: 0.35rem;
    }

    .preview :global(:target) {
        outline: 3px solid #d49b35;
        outline-offset: 4px;
        background: #fff6d8;
    }

    @media (max-width: 800px) {
        .page {
            width: min(100% - 1rem, 44rem);
            padding-top: 0.5rem;
        }

        .comparison {
            grid-template-columns: 1fr;
        }

        pre,
        .preview {
            min-height: 18rem;
        }

        button {
            flex: 1 1 11rem;
        }
    }
</style>
