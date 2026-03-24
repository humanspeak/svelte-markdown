<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { tick } from 'svelte'

    // --- Simulated LLM content with diverse markdown features ---
    const LLM_RESPONSE = `# Understanding Reactive Systems

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
| Performance | Excellent | Good | Good |

## Advanced Patterns

Sometimes you need to combine multiple streams. Consider this scenario:

- User types in a search box
- Each keystroke triggers an API call
- Results should be **debounced** and *deduplicated*
- Errors must be handled gracefully

### Error Handling

Always wrap async operations:

\`\`\`typescript
async function fetchResults(query: string): Promise<Result[]> {
    try {
        const response = await fetch(\`/api/search?q=\${query}\`)
        if (!response.ok) throw new Error('Search failed')
        return response.json()
    } catch (error) {
        console.error('Search error:', error)
        return []
    }
}
\`\`\`

### Nested Lists

- Reactive primitives
  - Signals
  - Computed values
  - Effects
- State management
  - Local state
  - Global stores
  - Context API

## Conclusion

Reactive systems are the backbone of modern UI frameworks. By understanding these patterns, you can build applications that are both **performant** and **maintainable**.

For more information, visit the [Svelte documentation](https://svelte.dev/docs) or check out the [tutorial](https://learn.svelte.dev).

---

*Thanks for reading!*`

    // --- State ---
    let source = $state('')
    let isStreaming = $state(false)
    let tokensPerSecond = $state(30)
    let jitterPercent = $state(50)
    let chunkMode: 'character' | 'word' | 'sentence' = $state('word')

    // Metrics
    let tokenCount = $state(0)
    let lastRenderTime = $state(0)
    let peakRenderTime = $state(0)
    let totalRenderTime = $state(0)
    let renderCount = $state(0)
    let droppedFrames = $state(0)

    let avgRenderTime = $derived(renderCount > 0 ? totalRenderTime / renderCount : 0)

    // Internals
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let chunks: string[] = $state([])
    let chunkIndex = $state(0)
    let lastFrameTime = 0
    let rafId = 0
    let sessionId = 0
    let previewEl: HTMLDivElement | undefined = $state()

    // --- Chunking ---
    const splitIntoChunks = (text: string, mode: typeof chunkMode): string[] => {
        if (mode === 'character') {
            return text.split('')
        }
        if (mode === 'sentence') {
            const result: string[] = []
            const regex = /[^.!?\n]+[.!?\n]+\s*/g
            let match
            while ((match = regex.exec(text)) !== null) {
                result.push(match[0])
            }
            // Grab any trailing text without punctuation
            const consumed = result.join('').length
            if (consumed < text.length) {
                result.push(text.slice(consumed))
            }
            return result
        }
        // Word mode: split on whitespace boundaries, keeping the whitespace with the preceding word
        const result: string[] = []
        const regex = /\S+\s*/g
        let match
        while ((match = regex.exec(text)) !== null) {
            result.push(match[0])
        }
        return result
    }

    // --- Jittered delay ---
    const getDelay = (): number => {
        const baseDelay = 1000 / tokensPerSecond
        if (jitterPercent === 0) return baseDelay
        const jitterRange = baseDelay * (jitterPercent / 100)
        return baseDelay + (Math.random() * 2 - 1) * jitterRange
    }

    // --- Frame drop detection ---
    const trackFrames = (timestamp: number) => {
        if (lastFrameTime > 0) {
            const gap = timestamp - lastFrameTime
            // A frame should be ~16.7ms at 60fps; if gap > 50ms we "dropped" frames
            if (gap > 50) {
                droppedFrames += Math.floor(gap / 16.7) - 1
            }
        }
        lastFrameTime = timestamp
        if (isStreaming) {
            rafId = requestAnimationFrame(trackFrames)
        }
    }

    // --- Streaming loop ---
    const streamNext = async (runId: number) => {
        if (runId !== sessionId) return
        if (chunkIndex >= chunks.length) {
            isStreaming = false
            return
        }

        const start = performance.now()
        source += chunks[chunkIndex]
        chunkIndex++
        tokenCount = chunkIndex
        await tick()
        if (runId !== sessionId) return
        const elapsed = performance.now() - start

        lastRenderTime = elapsed
        totalRenderTime += elapsed
        renderCount++
        if (elapsed > peakRenderTime) peakRenderTime = elapsed

        const avg = totalRenderTime / renderCount
        console.log(
            `[stream] chunk ${chunkIndex}/${chunks.length} | render: ${elapsed.toFixed(2)}ms | avg: ${avg.toFixed(2)}ms | peak: ${peakRenderTime.toFixed(2)}ms | dropped: ${droppedFrames}`
        )

        // Auto-scroll preview
        if (previewEl) {
            previewEl.scrollTop = previewEl.scrollHeight
        }

        if (isStreaming && runId === sessionId) {
            timeoutId = setTimeout(() => streamNext(runId), Math.max(0, getDelay()))
        }
    }

    // --- Controls ---
    const start = () => {
        if (isStreaming) return
        if (chunkIndex >= chunks.length || chunks.length === 0) {
            // Fresh start
            chunks = splitIntoChunks(LLM_RESPONSE, chunkMode)
            chunkIndex = 0
            source = ''
            resetMetrics()
        }
        sessionId++
        isStreaming = true
        lastFrameTime = 0
        rafId = requestAnimationFrame(trackFrames)
        streamNext(sessionId)
    }

    const stop = () => {
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

    const reset = () => {
        stop()
        source = ''
        chunks = []
        chunkIndex = 0
        resetMetrics()
    }

    const resetMetrics = () => {
        tokenCount = 0
        lastRenderTime = 0
        peakRenderTime = 0
        totalRenderTime = 0
        renderCount = 0
        droppedFrames = 0
    }

    const formatMs = (ms: number): string => {
        if (ms < 1) return '<1ms'
        return `${ms.toFixed(1)}ms`
    }

    // --- Teardown ---
    $effect(() => {
        return () => stop()
    })
</script>

<div class="container">
    <div class="controls">
        <h2>Streaming Simulation</h2>

        <div class="button-row">
            <button onclick={start} disabled={isStreaming} class="btn start">Start</button>
            <button onclick={stop} disabled={!isStreaming} class="btn stop">Stop</button>
            <button onclick={reset} class="btn reset">Reset</button>
        </div>

        <div class="slider-group">
            <label>
                Speed: <strong>{tokensPerSecond}</strong> chunks/sec
                <input
                    type="range"
                    min="5"
                    max="100"
                    step="5"
                    bind:value={tokensPerSecond}
                    disabled={isStreaming}
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
                    disabled={isStreaming}
                /> Character</label
            >
            <label
                ><input type="radio" bind:group={chunkMode} value="word" disabled={isStreaming} /> Word</label
            >
            <label
                ><input
                    type="radio"
                    bind:group={chunkMode}
                    value="sentence"
                    disabled={isStreaming}
                /> Sentence</label
            >
        </div>

        <div class="metrics" data-testid="metrics">
            <h3>Metrics</h3>
            <div class="metric-grid">
                <span class="metric-label">Chunks streamed:</span>
                <span class="metric-value">{tokenCount} / {chunks.length || '—'}</span>

                <span class="metric-label">Last render:</span>
                <span
                    class="metric-value"
                    class:warn={lastRenderTime > 16}
                    class:danger={lastRenderTime > 50}
                >
                    {formatMs(lastRenderTime)}
                </span>

                <span class="metric-label">Average render:</span>
                <span
                    class="metric-value"
                    class:warn={avgRenderTime > 16}
                    class:danger={avgRenderTime > 50}
                >
                    {formatMs(avgRenderTime)}
                </span>

                <span class="metric-label">Peak render:</span>
                <span
                    class="metric-value"
                    class:warn={peakRenderTime > 16}
                    class:danger={peakRenderTime > 50}
                >
                    {formatMs(peakRenderTime)}
                </span>

                <span class="metric-label">Dropped frames:</span>
                <span class="metric-value" class:danger={droppedFrames > 0}>{droppedFrames}</span>
            </div>
        </div>

        <textarea
            readonly
            value={source}
            data-testid="markdown-input"
            placeholder="Streamed content will appear here..."
        ></textarea>
    </div>

    <div class="preview" data-testid="preview" bind:this={previewEl}>
        <SvelteMarkdown {source} />
    </div>
</div>

<style>
    .container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding: 1rem;
        height: 100vh;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        overflow-y: auto;
    }

    h2 {
        margin: 0;
    }

    h3 {
        margin: 0 0 0.25rem;
    }

    .button-row {
        display: flex;
        gap: 0.5rem;
    }

    .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
        font-weight: 600;
        color: white;
    }

    .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn.start {
        background: #38a169;
    }

    .btn.start:hover:not(:disabled) {
        background: #2f855a;
    }

    .btn.stop {
        background: #e53e3e;
    }

    .btn.stop:hover:not(:disabled) {
        background: #c53030;
    }

    .btn.reset {
        background: #4a5568;
    }

    .btn.reset:hover:not(:disabled) {
        background: #2d3748;
    }

    .slider-group label {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        font-size: 0.9rem;
    }

    .slider-group input[type='range'] {
        width: 100%;
    }

    .chunk-selector {
        display: flex;
        gap: 0.75rem;
        align-items: center;
        font-size: 0.9rem;
        flex-wrap: wrap;
    }

    .chunk-selector label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .metrics {
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        padding: 0.75rem;
    }

    .metric-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.25rem 1rem;
        font-size: 0.85rem;
        font-family: monospace;
    }

    .metric-label {
        color: #4a5568;
    }

    .metric-value {
        font-weight: 600;
    }

    .metric-value.warn {
        color: #d69e2e;
    }

    .metric-value.danger {
        color: #e53e3e;
    }

    textarea {
        flex: 1;
        min-height: 150px;
        padding: 0.5rem;
        font-family: monospace;
        font-size: 0.8rem;
        resize: none;
        background: #f7fafc;
    }

    .preview {
        padding: 0.75rem;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
    }
</style>
