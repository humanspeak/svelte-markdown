<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { StreamingChunk, StreamingOffsetChunk } from '$lib/types.js'
    import type { MarkedExtension } from 'marked'
    import { tick } from 'svelte'

    interface ImperativeMarkdownHandle {
        writeChunk: (_chunk: StreamingChunk) => void
        resetStream: (_nextSource?: string) => void
    }

    type ChunkMode = 'character' | 'word' | 'sentence'

    interface StreamMetrics {
        chunkCount: number
        lastRenderTime: number
        peakRenderTime: number
        totalRenderTime: number
        renderCount: number
        droppedFrames: number
    }

    const APPEND_RESPONSE = `# Imperative Append Streaming

Chunking and metrics are the point of this page.

## Why This Matters

- Small chunks stress the parser differently than large ones
- Batched writes should cut down parse frequency
- Visual update timing matters just as much as token count

### Example

\`\`\`ts
markdown.writeChunk('Hello')
markdown.writeChunk(' ')
markdown.writeChunk('world')
\`\`\`

The preview should feel smooth even when the feed is noisy.`

    const OFFSET_RESPONSE = `# Offset Patch Streaming

Websocket-style chunks can arrive out of order.

## What To Watch

- gaps are padded with spaces
- later chunks can land before earlier ones
- the final output should still converge

### Transport Notes

Offset chunks let the component reconcile display state while callers stay dumb.`

    const createMetrics = (): StreamMetrics => ({
        chunkCount: 0,
        lastRenderTime: 0,
        peakRenderTime: 0,
        totalRenderTime: 0,
        renderCount: 0,
        droppedFrames: 0
    })

    const asyncUppercaseCode = (): MarkedExtension => ({
        async: true,
        async walkTokens() {
            return Promise.resolve()
        }
    })

    const asyncExtensions = [asyncUppercaseCode()]

    let appendMarkdown: ImperativeMarkdownHandle | undefined = $state()
    let offsetMarkdown: ImperativeMarkdownHandle | undefined = $state()
    let asyncMarkdown: ImperativeMarkdownHandle | undefined = $state()

    let appendPreviewEl: HTMLDivElement | undefined = $state()
    let offsetPreviewEl: HTMLDivElement | undefined = $state()

    let appendSource = $state('')
    let offsetSource = $state('')
    let asyncSource = $state('')

    let appendMirror = $state('')
    let offsetMirror = $state('')

    let chunkMode: ChunkMode = $state('word')
    let chunksPerSecond = $state(30)
    let jitterPercent = $state(50)
    let jumbleOffsetChunks = $state(true)

    let appendIsStreaming = $state(false)
    let offsetIsStreaming = $state(false)

    let appendMetrics = $state(createMetrics())
    let offsetMetrics = $state(createMetrics())

    let appendChunks: string[] = $state([])
    let offsetChunks: StreamingOffsetChunk[] = $state([])
    let appendChunkIndex = $state(0)
    let offsetChunkIndex = $state(0)

    let appendTimeoutId: ReturnType<typeof setTimeout> | null = null
    let offsetTimeoutId: ReturnType<typeof setTimeout> | null = null
    let appendFrameId = 0
    let offsetFrameId = 0
    let appendLastFrameTime = 0
    let offsetLastFrameTime = 0
    let appendSessionId = 0
    let offsetSessionId = 0

    let appendAvgRenderTime = $derived(
        appendMetrics.renderCount > 0
            ? appendMetrics.totalRenderTime / appendMetrics.renderCount
            : 0
    )
    let offsetAvgRenderTime = $derived(
        offsetMetrics.renderCount > 0
            ? offsetMetrics.totalRenderTime / offsetMetrics.renderCount
            : 0
    )

    const splitIntoChunks = (text: string, mode: ChunkMode): string[] => {
        if (mode === 'character') {
            return text.split('')
        }

        if (mode === 'sentence') {
            const result: string[] = []
            const regex = /[^.!?\n]+[.!?\n]+\s*/g
            let match: RegExpExecArray | null

            while ((match = regex.exec(text)) !== null) {
                result.push(match[0])
            }

            const consumed = result.join('').length
            if (consumed < text.length) {
                result.push(text.slice(consumed))
            }

            return result
        }

        const result: string[] = []
        const regex = /\S+\s*/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(text)) !== null) {
            result.push(match[0])
        }

        return result
    }

    const buildOffsetChunks = (
        text: string,
        mode: ChunkMode,
        shouldJumble: boolean
    ): StreamingOffsetChunk[] => {
        const values = splitIntoChunks(text, mode)
        let offset = 0
        const chunks = values.map((value) => {
            const chunk = { value, offset }
            offset += value.length
            return chunk
        })

        if (!shouldJumble || chunks.length < 3) {
            return chunks
        }

        const oddIndexed = chunks.filter((_, index) => index % 2 === 1)
        const evenIndexed = chunks.filter((_, index) => index % 2 === 0)
        return [...oddIndexed, ...evenIndexed]
    }

    const applyOffsetToMirror = (buffer: string, chunk: StreamingOffsetChunk): string => {
        const padded =
            chunk.offset > buffer.length
                ? buffer + ' '.repeat(chunk.offset - buffer.length)
                : buffer
        const prefix = padded.slice(0, chunk.offset)
        const suffix = padded.slice(chunk.offset + chunk.value.length)
        return prefix + chunk.value + suffix
    }

    const getDelay = (): number => {
        const baseDelay = 1000 / chunksPerSecond
        if (jitterPercent === 0) return baseDelay
        const jitterRange = baseDelay * (jitterPercent / 100)
        return baseDelay + (Math.random() * 2 - 1) * jitterRange
    }

    const formatMs = (ms: number): string => {
        if (ms < 1) return '<1ms'
        return `${ms.toFixed(1)}ms`
    }

    const updateDroppedFrames = (
        metrics: StreamMetrics,
        timestamp: number,
        lastFrameTime: number
    ): number => {
        if (lastFrameTime > 0) {
            const gap = timestamp - lastFrameTime
            if (gap > 50) {
                metrics.droppedFrames += Math.floor(gap / 16.7) - 1
            }
        }

        return timestamp
    }

    const trackAppendFrames = (timestamp: number) => {
        appendLastFrameTime = updateDroppedFrames(appendMetrics, timestamp, appendLastFrameTime)
        if (appendIsStreaming) {
            appendFrameId = requestAnimationFrame(trackAppendFrames)
        }
    }

    const trackOffsetFrames = (timestamp: number) => {
        offsetLastFrameTime = updateDroppedFrames(offsetMetrics, timestamp, offsetLastFrameTime)
        if (offsetIsStreaming) {
            offsetFrameId = requestAnimationFrame(trackOffsetFrames)
        }
    }

    const waitForPaint = async () => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            await new Promise<void>((resolve) => {
                window.requestAnimationFrame(() => resolve())
            })
        }

        await tick()
    }

    const recordRender = async (
        metrics: StreamMetrics,
        startedAt: number,
        previewEl: HTMLDivElement | undefined
    ) => {
        await waitForPaint()
        const elapsed = performance.now() - startedAt
        metrics.lastRenderTime = elapsed
        metrics.totalRenderTime += elapsed
        metrics.renderCount += 1
        metrics.peakRenderTime = Math.max(metrics.peakRenderTime, elapsed)

        if (previewEl) {
            previewEl.scrollTop = previewEl.scrollHeight
        }
    }

    const stopAppend = () => {
        appendIsStreaming = false
        appendSessionId += 1
        if (appendTimeoutId) {
            clearTimeout(appendTimeoutId)
            appendTimeoutId = null
        }
        if (appendFrameId) {
            cancelAnimationFrame(appendFrameId)
            appendFrameId = 0
        }
    }

    const stopOffset = () => {
        offsetIsStreaming = false
        offsetSessionId += 1
        if (offsetTimeoutId) {
            clearTimeout(offsetTimeoutId)
            offsetTimeoutId = null
        }
        if (offsetFrameId) {
            cancelAnimationFrame(offsetFrameId)
            offsetFrameId = 0
        }
    }

    const resetAppendMetrics = () => {
        appendMetrics = createMetrics()
    }

    const resetOffsetMetrics = () => {
        offsetMetrics = createMetrics()
    }

    const resetAppend = () => {
        stopAppend()
        appendSource = ''
        appendMirror = ''
        appendChunks = []
        appendChunkIndex = 0
        appendMarkdown?.resetStream()
        resetAppendMetrics()
    }

    const resetOffset = () => {
        stopOffset()
        offsetSource = ''
        offsetMirror = ''
        offsetChunks = []
        offsetChunkIndex = 0
        offsetMarkdown?.resetStream()
        resetOffsetMetrics()
    }

    const writeAppend = (chunk: string) => {
        appendMirror += chunk
        appendMarkdown?.writeChunk(chunk)
    }

    const writeOffset = (chunk: StreamingChunk) => {
        if (typeof chunk === 'string') {
            offsetMirror += chunk
        } else {
            offsetMirror = applyOffsetToMirror(offsetMirror, chunk)
        }

        offsetMarkdown?.writeChunk(chunk)
    }

    const streamNextAppend = async (runId: number) => {
        if (runId !== appendSessionId) return

        if (appendChunkIndex >= appendChunks.length) {
            stopAppend()
            return
        }

        const chunk = appendChunks[appendChunkIndex]
        const startedAt = performance.now()

        writeAppend(chunk)
        appendChunkIndex += 1
        appendMetrics.chunkCount = appendChunkIndex

        await recordRender(appendMetrics, startedAt, appendPreviewEl)

        if (appendIsStreaming && runId === appendSessionId) {
            appendTimeoutId = setTimeout(() => streamNextAppend(runId), Math.max(0, getDelay()))
        }
    }

    const streamNextOffset = async (runId: number) => {
        if (runId !== offsetSessionId) return

        if (offsetChunkIndex >= offsetChunks.length) {
            stopOffset()
            return
        }

        const chunk = offsetChunks[offsetChunkIndex]
        const startedAt = performance.now()

        writeOffset(chunk)
        offsetChunkIndex += 1
        offsetMetrics.chunkCount = offsetChunkIndex

        await recordRender(offsetMetrics, startedAt, offsetPreviewEl)

        if (offsetIsStreaming && runId === offsetSessionId) {
            offsetTimeoutId = setTimeout(() => streamNextOffset(runId), Math.max(0, getDelay()))
        }
    }

    const startAppendSimulation = () => {
        if (appendIsStreaming) return

        appendChunks = splitIntoChunks(APPEND_RESPONSE, chunkMode)
        appendChunkIndex = 0
        appendSource = ''
        appendMirror = ''
        appendMarkdown?.resetStream()
        resetAppendMetrics()

        appendSessionId += 1
        appendIsStreaming = true
        appendLastFrameTime = 0
        appendFrameId = requestAnimationFrame(trackAppendFrames)
        streamNextAppend(appendSessionId)
    }

    const startOffsetSimulation = () => {
        if (offsetIsStreaming) return

        offsetChunks = buildOffsetChunks(OFFSET_RESPONSE, chunkMode, jumbleOffsetChunks)
        offsetChunkIndex = 0
        offsetSource = ''
        offsetMirror = ''
        offsetMarkdown?.resetStream()
        resetOffsetMetrics()

        offsetSessionId += 1
        offsetIsStreaming = true
        offsetLastFrameTime = 0
        offsetFrameId = requestAnimationFrame(trackOffsetFrames)
        streamNextOffset(offsetSessionId)
    }

    const resetAppendWithSeed = () => {
        stopAppend()
        appendSource = ''
        appendMirror = '# Seed'
        appendChunks = []
        appendChunkIndex = 0
        appendMarkdown?.resetStream('# Seed')
        resetAppendMetrics()
    }

    const resetAppendViaProp = () => {
        stopAppend()
        appendSource = '# Prop Seed'
        appendMirror = appendSource
        appendChunks = []
        appendChunkIndex = 0
        resetAppendMetrics()
    }

    const resetOffsetViaProp = () => {
        stopOffset()
        offsetSource = 'Seed'
        offsetMirror = offsetSource
        offsetChunks = []
        offsetChunkIndex = 0
        resetOffsetMetrics()
    }

    $effect(() => {
        return () => {
            stopAppend()
            stopOffset()
        }
    })
</script>

<svelte:head>
    <title>Imperative Streaming Test</title>
</svelte:head>

<div class="container" data-testid="imperative-streaming-page">
    <div class="controls">
        <header class="hero">
            <h1>Imperative Streaming Test Harness</h1>
            <p>
                This page is for chunking and metrics first. Append mode simulates normal streamed
                text. Offset mode simulates websocket-style patch chunks, including intentionally
                jumbled delivery.
            </p>
        </header>

        <section class="panel">
            <h2>Shared Stream Controls</h2>

            <div class="slider-group">
                <label>
                    Speed: <strong>{chunksPerSecond}</strong> chunks/sec
                    <input
                        type="range"
                        min="5"
                        max="100"
                        step="5"
                        bind:value={chunksPerSecond}
                        disabled={appendIsStreaming || offsetIsStreaming}
                    />
                </label>
            </div>

            <div class="slider-group">
                <label>
                    Jitter: <strong>{jitterPercent}%</strong>
                    <input type="range" min="0" max="100" step="5" bind:value={jitterPercent} />
                </label>
            </div>

            <div class="chunk-selector">
                <span>Chunk mode:</span>
                <label
                    ><input
                        type="radio"
                        bind:group={chunkMode}
                        value="character"
                        disabled={appendIsStreaming || offsetIsStreaming}
                    />
                    Character</label
                >
                <label
                    ><input
                        type="radio"
                        bind:group={chunkMode}
                        value="word"
                        disabled={appendIsStreaming || offsetIsStreaming}
                    />
                    Word</label
                >
                <label
                    ><input
                        type="radio"
                        bind:group={chunkMode}
                        value="sentence"
                        disabled={appendIsStreaming || offsetIsStreaming}
                    />
                    Sentence</label
                >
            </div>

            <div class="chunk-selector">
                <label
                    ><input
                        type="checkbox"
                        bind:checked={jumbleOffsetChunks}
                        disabled={offsetIsStreaming}
                    />
                    Jumble offset chunks</label
                >
            </div>
        </section>

        <section class="panel">
            <h2>Append Mode</h2>

            <div class="button-row">
                <button
                    data-testid="append-start-sim"
                    onclick={startAppendSimulation}
                    disabled={appendIsStreaming}
                    class="btn start"
                >
                    Start Simulation
                </button>
                <button
                    data-testid="append-stop-sim"
                    onclick={stopAppend}
                    disabled={!appendIsStreaming}
                    class="btn stop"
                >
                    Stop
                </button>
                <button data-testid="append-reset" onclick={resetAppend} class="btn reset">
                    Reset
                </button>
            </div>

            <div class="metrics" data-testid="append-metrics">
                <h3>Append Metrics</h3>
                <div class="metric-grid">
                    <span class="metric-label">Chunks streamed:</span>
                    <span class="metric-value"
                        >{appendMetrics.chunkCount} / {appendChunks.length || '—'}</span
                    >

                    <span class="metric-label">Last render:</span>
                    <span
                        class="metric-value"
                        class:warn={appendMetrics.lastRenderTime > 16}
                        class:danger={appendMetrics.lastRenderTime > 50}
                    >
                        {formatMs(appendMetrics.lastRenderTime)}
                    </span>

                    <span class="metric-label">Average render:</span>
                    <span
                        class="metric-value"
                        class:warn={appendAvgRenderTime > 16}
                        class:danger={appendAvgRenderTime > 50}
                    >
                        {formatMs(appendAvgRenderTime)}
                    </span>

                    <span class="metric-label">Peak render:</span>
                    <span
                        class="metric-value"
                        class:warn={appendMetrics.peakRenderTime > 16}
                        class:danger={appendMetrics.peakRenderTime > 50}
                    >
                        {formatMs(appendMetrics.peakRenderTime)}
                    </span>

                    <span class="metric-label">Dropped frames:</span>
                    <span class="metric-value" class:danger={appendMetrics.droppedFrames > 0}>
                        {appendMetrics.droppedFrames}
                    </span>
                </div>
            </div>

            <div class="subsection">
                <h3>Manual API Writes</h3>
                <div class="button-row wrap">
                    <button data-testid="append-write-hello" onclick={() => writeAppend('Hello')}>
                        Write Hello
                    </button>
                    <button data-testid="append-write-space" onclick={() => writeAppend(' ')}>
                        Write Space
                    </button>
                    <button data-testid="append-write-world" onclick={() => writeAppend('World')}>
                        Write World
                    </button>
                    <button
                        data-testid="append-try-offset"
                        onclick={() => appendMarkdown?.writeChunk({ value: 'X', offset: 0 })}
                    >
                        Try Offset Chunk
                    </button>
                    <button data-testid="append-reset-seed" onclick={resetAppendWithSeed}>
                        Reset With Seed
                    </button>
                    <button data-testid="append-prop-reset" onclick={resetAppendViaProp}>
                        Reset Via Source Prop
                    </button>
                    <button data-testid="append-write-tail" onclick={() => writeAppend('\n\nTail')}>
                        Append Tail
                    </button>
                </div>
            </div>

            <textarea
                readonly
                value={appendMirror}
                data-testid="append-markdown-input"
                placeholder="Imperative append chunks will be mirrored here..."
            ></textarea>
        </section>

        <section class="panel">
            <h2>Offset Mode</h2>

            <div class="button-row">
                <button
                    data-testid="offset-start-sim"
                    onclick={startOffsetSimulation}
                    disabled={offsetIsStreaming}
                    class="btn start"
                >
                    Start Simulation
                </button>
                <button
                    data-testid="offset-stop-sim"
                    onclick={stopOffset}
                    disabled={!offsetIsStreaming}
                    class="btn stop"
                >
                    Stop
                </button>
                <button data-testid="offset-reset" onclick={resetOffset} class="btn reset">
                    Reset
                </button>
            </div>

            <div class="metrics" data-testid="offset-metrics">
                <h3>Offset Metrics</h3>
                <div class="metric-grid">
                    <span class="metric-label">Chunks streamed:</span>
                    <span class="metric-value"
                        >{offsetMetrics.chunkCount} / {offsetChunks.length || '—'}</span
                    >

                    <span class="metric-label">Last render:</span>
                    <span
                        class="metric-value"
                        class:warn={offsetMetrics.lastRenderTime > 16}
                        class:danger={offsetMetrics.lastRenderTime > 50}
                    >
                        {formatMs(offsetMetrics.lastRenderTime)}
                    </span>

                    <span class="metric-label">Average render:</span>
                    <span
                        class="metric-value"
                        class:warn={offsetAvgRenderTime > 16}
                        class:danger={offsetAvgRenderTime > 50}
                    >
                        {formatMs(offsetAvgRenderTime)}
                    </span>

                    <span class="metric-label">Peak render:</span>
                    <span
                        class="metric-value"
                        class:warn={offsetMetrics.peakRenderTime > 16}
                        class:danger={offsetMetrics.peakRenderTime > 50}
                    >
                        {formatMs(offsetMetrics.peakRenderTime)}
                    </span>

                    <span class="metric-label">Dropped frames:</span>
                    <span class="metric-value" class:danger={offsetMetrics.droppedFrames > 0}>
                        {offsetMetrics.droppedFrames}
                    </span>
                </div>
            </div>

            <div class="subsection">
                <h3>Manual Patch Writes</h3>
                <div class="button-row wrap">
                    <button
                        data-testid="offset-write-hello"
                        onclick={() => writeOffset({ value: 'Hello', offset: 0 })}
                    >
                        Write Hello
                    </button>
                    <button
                        data-testid="offset-write-tail"
                        onclick={() => writeOffset({ value: ' World', offset: 5 })}
                    >
                        Write Tail
                    </button>
                    <button
                        data-testid="offset-gap"
                        onclick={() => {
                            resetOffset()
                            writeOffset({ value: 'ab', offset: 0 })
                            writeOffset({ value: 'XY', offset: 4 })
                        }}
                    >
                        Write Gapped Chunk
                    </button>
                    <button
                        data-testid="offset-overwrite"
                        onclick={() => writeOffset({ value: 'Z', offset: 2 })}
                    >
                        Overwrite Index 2
                    </button>
                    <button
                        data-testid="offset-try-append"
                        onclick={() => offsetMarkdown?.writeChunk('tail')}
                    >
                        Try String Chunk
                    </button>
                    <button data-testid="offset-prop-reset" onclick={resetOffsetViaProp}>
                        Reset Via Source Prop
                    </button>
                </div>
            </div>

            <textarea
                readonly
                value={offsetMirror}
                data-testid="offset-markdown-input"
                placeholder="Offset-applied source state will be mirrored here..."
            ></textarea>
        </section>

        <section class="panel">
            <h2>Async Extension Guard</h2>
            <p>
                Imperative writes should no-op when async extensions are active, since streaming
                stays on the synchronous parser path.
            </p>
            <div class="button-row">
                <button
                    data-testid="async-write"
                    onclick={() => asyncMarkdown?.writeChunk('# Noop')}
                >
                    Attempt Async Write
                </button>
            </div>
        </section>
    </div>

    <div class="preview-column">
        <section class="preview-panel">
            <h2>Append Preview</h2>
            <div class="preview" data-testid="append-preview" bind:this={appendPreviewEl}>
                <SvelteMarkdown bind:this={appendMarkdown} source={appendSource} streaming />
            </div>
        </section>

        <section class="preview-panel">
            <h2>Offset Preview</h2>
            <div class="preview" data-testid="offset-preview" bind:this={offsetPreviewEl}>
                <SvelteMarkdown bind:this={offsetMarkdown} source={offsetSource} streaming />
            </div>
        </section>

        <section class="preview-panel">
            <h2>Async Preview</h2>
            <div class="preview" data-testid="async-preview">
                <SvelteMarkdown
                    bind:this={asyncMarkdown}
                    source={asyncSource}
                    streaming
                    extensions={asyncExtensions}
                />
            </div>
        </section>
    </div>
</div>

<style>
    .container {
        display: grid;
        grid-template-columns: minmax(24rem, 34rem) minmax(0, 1fr);
        gap: 1rem;
        padding: 1rem;
        min-height: 100vh;
        background: #f8fafc;
        color: #0f172a;
    }

    .controls,
    .preview-column {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-height: 0;
    }

    .controls {
        overflow-y: auto;
    }

    .hero,
    .panel,
    .preview-panel {
        border: 1px solid #dbe4ee;
        border-radius: 0.75rem;
        background: white;
        box-shadow: 0 1px 2px rgb(15 23 42 / 0.06);
    }

    .hero,
    .panel,
    .preview-panel {
        padding: 1rem;
    }

    .hero h1,
    .panel h2,
    .preview-panel h2,
    .metrics h3,
    .subsection h3 {
        margin: 0;
    }

    .hero p,
    .panel p {
        margin: 0.5rem 0 0;
        line-height: 1.5;
        color: #334155;
    }

    .button-row {
        display: flex;
        gap: 0.5rem;
    }

    .button-row.wrap {
        flex-wrap: wrap;
    }

    button {
        border: 1px solid #0f172a;
        border-radius: 0.4rem;
        background: #0f172a;
        color: white;
        padding: 0.5rem 0.9rem;
        font-weight: 600;
        cursor: pointer;
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn.start {
        background: #15803d;
        border-color: #15803d;
    }

    .btn.stop {
        background: #b91c1c;
        border-color: #b91c1c;
    }

    .btn.reset {
        background: #475569;
        border-color: #475569;
    }

    .slider-group label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.95rem;
    }

    .slider-group input[type='range'] {
        width: 100%;
    }

    .chunk-selector {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        flex-wrap: wrap;
        font-size: 0.95rem;
    }

    .chunk-selector label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .metrics {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 0.75rem;
    }

    .metric-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.25rem 1rem;
        margin-top: 0.5rem;
        font-size: 0.85rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .metric-label {
        color: #475569;
    }

    .metric-value {
        font-weight: 700;
    }

    .metric-value.warn {
        color: #b45309;
    }

    .metric-value.danger {
        color: #b91c1c;
    }

    .subsection {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        margin-top: 1rem;
    }

    textarea {
        width: 100%;
        min-height: 11rem;
        margin-top: 1rem;
        padding: 0.75rem;
        border: 1px solid #cbd5e1;
        border-radius: 0.5rem;
        resize: vertical;
        background: #f8fafc;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 0.8rem;
        line-height: 1.45;
    }

    .preview-column {
        min-height: 0;
    }

    .preview-panel {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        min-height: 0;
    }

    .preview {
        min-height: 14rem;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        background: #f8fafc;
        padding: 1rem;
        white-space: pre-wrap;
    }

    @media (max-width: 960px) {
        .container {
            grid-template-columns: 1fr;
        }
    }
</style>
