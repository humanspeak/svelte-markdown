<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { StreamingChunk, StreamingOffsetChunk } from '@humanspeak/svelte-markdown'
    import { tick } from 'svelte'

    const DEFAULT_LLM_RESPONSE = `# Understanding Reactive Systems

Reactive programming is a **declarative paradigm** concerned with _data streams_ and the propagation of change. Let's explore the key concepts.

## Core Principles

There are three fundamental ideas:

1. **Observables** — represent a stream of data over time
2. **Operators** — transform, filter, and combine streams
3. **Subscribers** — consume the final output

> "The best way to predict the future is to invent it." — Alan Kay

### A Simple Example

Here's a basic reactive counter in JavaScript:

\`\`\`javascript
import { writable } from 'svelte/store'

const count = writable(0)

count.subscribe(value => {
    console.log(\`Count is now: \${value}\`)
})

count.update(n => n + 1)
count.set(42)
\`\`\`

The \`writable\` store automatically notifies all subscribers when the value changes.

## Comparison Table

| Feature | Svelte | React | Vue |
|---------|--------|-------|-----|
| Reactivity | Compile-time | Runtime (hooks) | Runtime (proxy) |
| Bundle Size | Small | Medium | Medium |
| Learning Curve | Low | Medium | Low |

## Advanced Patterns

- User types in a search box
- Each keystroke triggers an API call
- Results should be **debounced** and *deduplicated*
- Errors must be handled gracefully

### Error Handling

\`\`\`typescript
async function fetchResults(query: string): Promise<Result[]> {
    const response = await fetch(\`/api/search?q=\${query}\`)
    if (!response.ok) throw new Error('Search failed')
    return response.json()
}
\`\`\`

## Conclusion

Reactive systems are the backbone of modern UI frameworks. By understanding these patterns, you can build applications that are both **performant** and **maintainable**.

For more information, visit the [Svelte documentation](https://svelte.dev/docs).

---

*Thanks for reading!*`

    type StreamMode = 'offset' | 'chunked' | 'concat'

    let input = $state(DEFAULT_LLM_RESPONSE)
    // `renderSource` is what we hand to <SvelteMarkdown {source}>. In
    // chunked/offset modes we leave it empty and let writeChunk drive
    // rendering so the source prop doesn't fight the streaming API.
    // `displaySource` is what we show in the SRC pane — offset patches
    // get placed at their actual offsets so the user sees the buffer
    // fill in (mirroring what the renderer assembles internally).
    let renderSource = $state('')
    let displaySource = $state('')
    let isStreaming = $state(false)
    let tokensPerSecond = $state(30)
    let jitterPercent = $state(50)
    let chunkMode: 'character' | 'word' | 'sentence' = $state('word')
    let streamMode = $state<StreamMode>('offset')
    let jumbleOffsetChunks = $state(true)

    let markdown:
        | {
              writeChunk: (chunk: StreamingChunk) => void
              resetStream: (nextSource?: string) => void
          }
        | undefined = $state()

    let tokenCount = $state(0)
    let lastRenderTime = $state(0)
    let peakRenderTime = $state(0)
    let totalRenderTime = $state(0)
    let renderCount = $state(0)
    let droppedFrames = $state(0)

    const avgRenderTime = $derived(renderCount > 0 ? totalRenderTime / renderCount : 0)
    const progress = $derived(
        chunks.length > 0 ? Math.round((chunkIndex / chunks.length) * 100) : 0
    )
    const chunkedStreamActive = $derived(streamMode === 'chunked' || streamMode === 'offset')

    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let chunks: StreamingChunk[] = $state([])
    let chunkIndex = $state(0)
    let lastFrameTime = 0
    let rafId = 0
    let sessionId = 0
    let previewEl: HTMLDivElement | undefined = $state()
    let sourceEl: HTMLPreElement | undefined = $state()

    const splitIntoChunks = (text: string, mode: typeof chunkMode): string[] => {
        if (mode === 'character') return text.split('')
        if (mode === 'sentence') {
            const result: string[] = []
            const regex = /[^.!?\n]+[.!?\n]+\s*/g
            let match
            while ((match = regex.exec(text)) !== null) result.push(match[0])
            const consumed = result.join('').length
            if (consumed < text.length) result.push(text.slice(consumed))
            return result
        }
        const result: string[] = []
        const regex = /\S+\s*/g
        let match
        while ((match = regex.exec(text)) !== null) result.push(match[0])
        return result
    }

    const buildOffsetChunks = (
        text: string,
        mode: typeof chunkMode,
        shouldJumble: boolean
    ): StreamingOffsetChunk[] => {
        const values = splitIntoChunks(text, mode)
        let offset = 0
        const offsetChunks = values.map((value) => {
            const chunk = { value, offset }
            offset += value.length
            return chunk
        })
        if (!shouldJumble || offsetChunks.length < 3) return offsetChunks
        const odd = offsetChunks.filter((_, i) => i % 2 === 1)
        const even = offsetChunks.filter((_, i) => i % 2 === 0)
        return [...odd, ...even]
    }

    const getDelay = (): number => {
        const baseDelay = 1000 / tokensPerSecond
        if (jitterPercent === 0) return baseDelay
        const jitterRange = baseDelay * (jitterPercent / 100)
        return baseDelay + (Math.random() * 2 - 1) * jitterRange
    }

    const trackFrames = (timestamp: number) => {
        if (lastFrameTime > 0) {
            const gap = timestamp - lastFrameTime
            if (gap > 50) droppedFrames += Math.floor(gap / 16.7) - 1
        }
        lastFrameTime = timestamp
        if (isStreaming) rafId = requestAnimationFrame(trackFrames)
    }

    const streamNext = async (runId: number) => {
        if (runId !== sessionId) return
        if (chunkIndex >= chunks.length) {
            isStreaming = false
            return
        }

        const start = performance.now()
        const chunk = chunks[chunkIndex]

        if (streamMode === 'chunked') {
            markdown?.writeChunk(chunk)
            if (typeof chunk === 'string') displaySource += chunk
        } else if (streamMode === 'offset') {
            markdown?.writeChunk(chunk)
            if (typeof chunk !== 'string') {
                // Place value at its declared offset, padding any gap
                // with spaces. As more patches arrive the buffer fills
                // in — exactly what the renderer sees after reassembly.
                const { value, offset } = chunk
                const padded = displaySource.padEnd(offset, ' ')
                displaySource =
                    padded.slice(0, offset) + value + padded.slice(offset + value.length)
            }
        } else if (typeof chunk === 'string') {
            renderSource += chunk
            displaySource = renderSource
        }
        chunkIndex++
        tokenCount = chunkIndex
        await tick()
        if (runId !== sessionId) return

        const elapsed = performance.now() - start
        lastRenderTime = Math.round(elapsed * 10) / 10
        totalRenderTime += elapsed
        renderCount++
        if (elapsed > peakRenderTime) peakRenderTime = Math.round(elapsed * 10) / 10

        if (previewEl) previewEl.scrollTop = previewEl.scrollHeight
        if (sourceEl) sourceEl.scrollTop = sourceEl.scrollHeight

        if (isStreaming && runId === sessionId) {
            timeoutId = setTimeout(() => streamNext(runId), Math.max(0, getDelay()))
        }
    }

    const clearOutput = () => {
        renderSource = ''
        displaySource = ''
        markdown?.resetStream('')
    }

    const resetMetrics = () => {
        tokenCount = 0
        lastRenderTime = 0
        peakRenderTime = 0
        totalRenderTime = 0
        renderCount = 0
        droppedFrames = 0
    }

    const startStreaming = () => {
        if (isStreaming) return
        chunks =
            streamMode === 'offset'
                ? buildOffsetChunks(input, chunkMode, jumbleOffsetChunks)
                : splitIntoChunks(input, chunkMode)
        chunkIndex = 0
        clearOutput()
        resetMetrics()
        sessionId++
        isStreaming = true
        lastFrameTime = 0
        rafId = requestAnimationFrame(trackFrames)
        streamNext(sessionId)
    }

    const stopStreaming = () => {
        isStreaming = false
        sessionId++
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
        }
        if (rafId) {
            cancelAnimationFrame(rafId)
            rafId = 0
        }
    }

    const resetStreaming = () => {
        stopStreaming()
        clearOutput()
        chunks = []
        chunkIndex = 0
        resetMetrics()
    }

    const restartStream = () => {
        stopStreaming()
        startStreaming()
    }

    const useDefault = () => {
        if (isStreaming) return
        input = DEFAULT_LLM_RESPONSE
        resetStreaming()
    }

    const formatMs = (ms: number): string => {
        if (ms === 0) return '0ms'
        if (ms < 1) return '<1ms'
        return `${ms.toFixed(1)}ms`
    }

    $effect(() => {
        return () => stopStreaming()
    })
</script>

<div class="ls">
    <!-- ── Brut bar ─────────────────────────────────────────────── -->
    <div class="ls-bar">
        <span><span class="lbl">file</span> · <span class="v">llm-streaming.svelte</span></span>
        <span><span class="lbl">avg</span> <span class="v">{formatMs(avgRenderTime)}</span></span>
        <span><span class="lbl">peak</span> <span class="v">{formatMs(peakRenderTime)}</span></span>
        <span>
            <span class="lbl">chunks</span>
            <span class="v">{tokenCount}/{chunks.length || '—'}</span>
        </span>
        <span class="live">
            {#if isStreaming}● LIVE{:else}○ IDLE{/if}
        </span>
        <button class="ctrl" type="button" onclick={restartStream} disabled={isStreaming}>
            ↻ restart
        </button>
    </div>

    <!-- ── Source / Output pane grid ────────────────────────────── -->
    <div class="ls-grid">
        <div class="ls-pane">
            <div class="ls-label">
                <span>SRC / STREAMING</span>
                <span class="ls-meta">
                    {input.length} chars
                    <button
                        class="ls-mini"
                        type="button"
                        onclick={useDefault}
                        disabled={isStreaming}
                    >
                        ↺ default
                    </button>
                </span>
            </div>
            {#if isStreaming || tokenCount > 0}
                <pre bind:this={sourceEl} class="ls-src ls-src-live">{displaySource}<span
                        class="cursor"></span></pre>
            {:else}
                <textarea
                    bind:value={input}
                    class="ls-src ls-src-edit"
                    spellcheck="false"
                    placeholder="Paste markdown to stream..."
                ></textarea>
            {/if}
        </div>
        <div class="ls-pane out">
            <div class="ls-label">
                <span>OUT / RENDERED</span>
                <span class="ls-meta">
                    {#if isStreaming}
                        streaming
                    {:else if tokenCount > 0 && tokenCount >= chunks.length}
                        complete
                    {:else}
                        idle
                    {/if}
                </span>
            </div>
            {#if renderSource || chunkedStreamActive}
                <div
                    bind:this={previewEl}
                    class="ls-out prose prose-sm dark:prose-invert max-w-none"
                >
                    <SvelteMarkdown bind:this={markdown} source={renderSource} streaming={true} />
                </div>
            {:else}
                <div class="ls-empty">Click "Start" to begin streaming.</div>
            {/if}
        </div>
    </div>

    <!-- ── Controls strip ───────────────────────────────────────── -->
    <div class="ls-controls">
        <div class="ls-actions">
            <button class="ls-btn ls-btn-primary" onclick={startStreaming} disabled={isStreaming}>
                ▶ start
            </button>
            <button class="ls-btn" onclick={stopStreaming} disabled={!isStreaming}>■ stop</button>
            <button class="ls-btn" onclick={resetStreaming}>↻ reset</button>
        </div>

        <div class="ls-config">
            <label class="ls-field">
                <span class="ls-field-k">speed</span>
                <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    bind:value={tokensPerSecond}
                    disabled={isStreaming}
                />
                <span class="ls-field-v">{tokensPerSecond}/s</span>
            </label>

            <label class="ls-field">
                <span class="ls-field-k">jitter</span>
                <input type="range" min="0" max="100" step="5" bind:value={jitterPercent} />
                <span class="ls-field-v">{jitterPercent}%</span>
            </label>

            <div class="ls-field ls-field-radio">
                <span class="ls-field-k">chunk</span>
                <div class="ls-radio-group">
                    {#each ['character', 'word', 'sentence'] as m (m)}
                        <label class="ls-radio">
                            <input
                                type="radio"
                                bind:group={chunkMode}
                                value={m}
                                disabled={isStreaming}
                            />
                            <span>{m}</span>
                        </label>
                    {/each}
                </div>
            </div>

            <div class="ls-field ls-field-radio">
                <span class="ls-field-k">mode</span>
                <div class="ls-radio-group">
                    <label class="ls-radio">
                        <input
                            type="radio"
                            bind:group={streamMode}
                            value="offset"
                            disabled={isStreaming}
                        />
                        <span>offset (default)</span>
                    </label>
                    <label class="ls-radio">
                        <input
                            type="radio"
                            bind:group={streamMode}
                            value="chunked"
                            disabled={isStreaming}
                        />
                        <span>writeChunk</span>
                    </label>
                    <label class="ls-radio">
                        <input
                            type="radio"
                            bind:group={streamMode}
                            value="concat"
                            disabled={isStreaming}
                        />
                        <span>source +=</span>
                    </label>
                </div>
            </div>

            {#if streamMode === 'offset'}
                <label class="ls-radio ls-jumble">
                    <input
                        type="checkbox"
                        bind:checked={jumbleOffsetChunks}
                        disabled={isStreaming}
                    />
                    <span>shuffle so later patches arrive first</span>
                </label>
            {/if}
        </div>
    </div>

    <!-- ── Footer metrics ───────────────────────────────────────── -->
    <div class="ls-footer">
        <div><span class="lbl">progress</span> · <span class="v">{progress}%</span></div>
        <div><span class="lbl">last</span> · <span class="v">{formatMs(lastRenderTime)}</span></div>
        <div><span class="lbl">avg</span> · <span class="v">{formatMs(avgRenderTime)}</span></div>
        <div><span class="lbl">peak</span> · <span class="v">{formatMs(peakRenderTime)}</span></div>
        <div><span class="lbl">dropped</span> · <span class="v">{droppedFrames}</span></div>
        <div><span class="lbl">render #</span> · <span class="v">{renderCount}</span></div>
    </div>
</div>

<style>
    .ls {
        display: flex;
        flex-direction: column;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink, currentColor);
        background: var(--brut-bg);
    }

    /* ── Brut bar (file · avg · peak · chunks · LIVE · restart) ── */
    .ls-bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        flex-wrap: wrap;
    }
    .ls-bar .lbl {
        color: var(--brut-ink-3);
    }
    .ls-bar .v {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
    }
    .ls-bar .live {
        margin-left: auto;
        color: var(--brut-accent);
        letter-spacing: 0.1em;
        font-weight: 600;
    }
    .ls-bar .ctrl {
        appearance: none;
        background: transparent;
        border: 1px solid var(--brut-rule);
        color: var(--brut-ink-2);
        padding: 3px 8px;
        font: inherit;
        font-size: 10.5px;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition:
            color 0.15s,
            border-color 0.15s;
    }
    .ls-bar .ctrl:hover:not(:disabled) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .ls-bar .ctrl:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    /* ── Source / Output two-pane ───────────────────────────────── */
    .ls-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        min-height: 380px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .ls-pane {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
    }
    .ls-pane.out {
        border-left: 1px solid var(--brut-rule);
    }
    .ls-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 0 14px;
        min-height: 32px;
        background: var(--brut-bg-2);
        border-bottom: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .ls-meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        letter-spacing: 0.04em;
        text-transform: lowercase;
        font-size: 10px;
        color: var(--brut-ink-3);
    }
    .ls-mini {
        appearance: none;
        background: transparent;
        border: 0;
        color: var(--brut-ink-3);
        padding: 0;
        font: inherit;
        font-size: 10px;
        letter-spacing: 0.04em;
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: transparent;
        text-underline-offset: 2px;
        transition:
            color 0.15s,
            text-decoration-color 0.15s;
    }
    .ls-mini:hover:not(:disabled) {
        color: var(--brut-accent);
        text-decoration-color: var(--brut-accent);
    }
    .ls-mini:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    .ls-src {
        flex: 1;
        min-height: 0;
        margin: 0;
        padding: 12px 14px;
        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        line-height: 1.65;
        overflow-y: auto;
        border: 0;
        outline: none;
        resize: none;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 480px;
    }
    .ls-src-edit:focus {
        background: var(--brut-bg-2);
    }
    .cursor {
        display: inline-block;
        width: 7px;
        height: 1em;
        margin-left: 1px;
        background: var(--brut-accent);
        vertical-align: text-bottom;
        animation: blink 1s steps(2, end) infinite;
    }
    @keyframes blink {
        0%,
        50% {
            opacity: 1;
        }
        51%,
        100% {
            opacity: 0;
        }
    }

    .ls-out {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        padding: 12px 14px;
        color: var(--brut-ink-2);
        max-height: 480px;
    }
    .ls-out :global(h1),
    .ls-out :global(h2),
    .ls-out :global(h3),
    .ls-out :global(h4) {
        color: var(--brut-ink);
        letter-spacing: -0.02em;
    }
    .ls-out :global(:not(pre) > code) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
    }
    .ls-out :global(pre) {
        margin: 12px 0;
        padding: 12px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        overflow-x: auto;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        line-height: 1.65;
        color: var(--brut-ink);
        border-radius: 0;
    }
    .ls-out :global(pre code) {
        background: transparent;
        border: 0;
        padding: 0;
    }
    .ls-out :global(blockquote) {
        border-left: 2px solid var(--brut-accent);
        padding-left: 12px;
        font-style: italic;
        color: var(--brut-ink-2);
    }
    .ls-out :global(table) {
        border-collapse: collapse;
        font-size: 12px;
    }
    .ls-out :global(th),
    .ls-out :global(td) {
        border: 1px solid var(--brut-rule);
        padding: 4px 8px;
    }
    .ls-empty {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--brut-ink-3);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: lowercase;
    }

    /* ── Controls ────────────────────────────────────────────────── */
    .ls-controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 14px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .ls-actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
    }
    .ls-btn {
        appearance: none;
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        border: 1px solid var(--brut-rule);
        padding: 7px 14px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: lowercase;
        cursor: pointer;
        transition:
            color 0.15s,
            border-color 0.15s,
            background 0.15s;
    }
    .ls-btn:hover:not(:disabled) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .ls-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .ls-btn-primary {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        border-color: var(--brut-accent);
        font-weight: 600;
    }
    .ls-btn-primary:hover:not(:disabled) {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
        color: var(--brut-accent-ink);
    }

    .ls-config {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px 18px;
    }
    .ls-field {
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-2);
    }
    .ls-field-k {
        color: var(--brut-ink-3);
        letter-spacing: 0.06em;
        min-width: 50px;
    }
    .ls-field input[type='range'] {
        flex: 1;
        accent-color: var(--brut-accent);
    }
    .ls-field-v {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
        min-width: 48px;
        text-align: right;
    }
    .ls-field-radio {
        align-items: flex-start;
    }
    .ls-radio-group {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }
    .ls-radio {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        color: var(--brut-ink-2);
        cursor: pointer;
    }
    .ls-radio input {
        accent-color: var(--brut-accent);
    }
    .ls-jumble {
        margin-top: 4px;
        padding: 6px 10px;
        border: 1px dashed var(--brut-rule);
        background: var(--brut-bg-2);
    }

    /* ── Footer ─────────────────────────────────────────────────── */
    .ls-footer {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
        padding: 8px 14px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .ls-footer .lbl {
        color: var(--brut-ink-3);
    }
    .ls-footer .v {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
    }

    @media (max-width: 900px) {
        .ls-grid {
            grid-template-columns: 1fr;
        }
        .ls-pane.out {
            border-left: 0;
            border-top: 1px solid var(--brut-rule);
        }
    }
</style>
