<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import {
        Play,
        Square,
        RotateCw,
        RotateCcw,
        Zap,
        Gauge,
        MonitorDot,
        Activity,
        DollarSign
    } from '@lucide/svelte'
    import { tick } from 'svelte'

    // --- Default simulated LLM response with diverse markdown features ---
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
    let input = $state(DEFAULT_LLM_RESPONSE)
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

    const avgRenderTime = $derived(renderCount > 0 ? totalRenderTime / renderCount : 0)
    const progress = $derived(
        chunks.length > 0 ? Math.round((chunkIndex / chunks.length) * 100) : 0
    )

    // Internals
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let chunks: string[] = $state([])
    let chunkIndex = $state(0)
    let lastFrameTime = 0
    let rafId = 0
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
            const consumed = result.join('').length
            if (consumed < text.length) {
                result.push(text.slice(consumed))
            }
            return result
        }
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
    const streamNext = async () => {
        if (chunkIndex >= chunks.length) {
            isStreaming = false
            return
        }

        const start = performance.now()
        source += chunks[chunkIndex]
        chunkIndex++
        tokenCount = chunkIndex
        await tick()
        const elapsed = performance.now() - start

        lastRenderTime = elapsed
        totalRenderTime += elapsed
        renderCount++
        if (elapsed > peakRenderTime) peakRenderTime = elapsed

        if (previewEl) {
            previewEl.scrollTop = previewEl.scrollHeight
        }

        if (isStreaming) {
            timeoutId = setTimeout(streamNext, Math.max(0, getDelay()))
        }
    }

    // --- Controls ---
    const startStreaming = () => {
        if (isStreaming) return
        if (chunkIndex >= chunks.length || chunks.length === 0) {
            chunks = splitIntoChunks(input, chunkMode)
            chunkIndex = 0
            source = ''
            resetMetrics()
        }
        isStreaming = true
        lastFrameTime = 0
        rafId = requestAnimationFrame(trackFrames)
        streamNext()
    }

    const stopStreaming = () => {
        isStreaming = false
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

    const useDefault = () => {
        if (isStreaming) return
        input = DEFAULT_LLM_RESPONSE
        resetStreaming()
    }

    const formatMs = (ms: number): string => {
        if (ms < 1) return '<1ms'
        return `${ms.toFixed(1)}ms`
    }
</script>

<div class="mx-auto w-full max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-6">
        <h2 class="text-foreground text-2xl font-bold">LLM Streaming Simulation</h2>
        <p class="text-muted-foreground mt-1 text-sm">
            Simulate real-time AI response streaming and measure render performance. Adjust speed,
            jitter, and chunking to test how
            <code class="bg-muted rounded px-1.5 py-0.5 text-xs">SvelteMarkdown</code>
            handles token-by-token updates from LLMs like ChatGPT, Claude, and Gemini.
        </p>
    </div>

    <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <!-- Left Column: Controls & Metrics -->
        <div class="space-y-4 xl:col-span-1">
            <!-- How it works -->
            <div
                class="border-brand-500/20 from-brand-500/5 to-brand-600/5 rounded-xl border bg-gradient-to-r p-5"
            >
                <h3 class="text-foreground mb-2 text-sm font-semibold">How LLM Streaming Works</h3>
                <ul class="text-muted-foreground space-y-1.5 text-sm">
                    <li class="flex items-start gap-2">
                        <Zap class="text-brand-500 mt-0.5 size-3 shrink-0" />
                        <span>
                            LLMs stream tokens via Server-Sent Events. Each token appends to the
                            markdown source.
                        </span>
                    </li>
                    <li class="flex items-start gap-2">
                        <Gauge class="text-brand-500 mt-0.5 size-3 shrink-0" />
                        <span>
                            SvelteMarkdown re-parses and re-renders on every source update, keeping
                            output in sync.
                        </span>
                    </li>
                    <li class="flex items-start gap-2">
                        <Activity class="text-brand-500 mt-0.5 size-3 shrink-0" />
                        <span>
                            Render times stay under 16ms (one frame budget) for typical LLM speeds
                            of 30-80 tokens/sec.
                        </span>
                    </li>
                    <li class="flex items-start gap-2">
                        <DollarSign class="text-brand-500 mt-0.5 size-3 shrink-0" />
                        <span>
                            Track token costs across providers with
                            <a
                                href="https://modelpricing.ai"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="text-brand-500 hover:text-brand-400 underline"
                            >
                                ModelPricing.ai
                            </a>.
                        </span>
                    </li>
                </ul>
            </div>

            <!-- Controls -->
            <div class="border-border bg-card rounded-xl border p-5 shadow-sm">
                <h3 class="text-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                    Stream Controls
                </h3>
                <div class="space-y-3">
                    <div class="grid grid-cols-3 gap-2">
                        <button
                            onclick={startStreaming}
                            disabled={isStreaming}
                            class="bg-brand-600 hover:bg-brand-700 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
                        >
                            <Play class="size-3" />
                            Start
                        </button>
                        <button
                            onclick={stopStreaming}
                            disabled={!isStreaming}
                            class="flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                        >
                            <Square class="size-3" />
                            Stop
                        </button>
                        <button
                            onclick={resetStreaming}
                            class="border-border bg-card text-muted-foreground hover:text-foreground hover:border-brand-500/50 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors"
                        >
                            <RotateCw class="size-3" />
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <!-- Speed & Jitter -->
            <div class="border-border bg-card rounded-xl border p-5 shadow-sm">
                <h3 class="text-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                    Configuration
                </h3>
                <div class="space-y-4">
                    <div>
                        <div class="mb-1.5 flex items-center justify-between">
                            <span class="text-muted-foreground text-sm">Speed</span>
                            <span class="text-foreground font-mono text-sm font-semibold">
                                {tokensPerSecond} chunks/sec
                            </span>
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="100"
                            step="5"
                            bind:value={tokensPerSecond}
                            disabled={isStreaming}
                            class="w-full accent-[var(--brand-500,#ec4899)]"
                        />
                    </div>
                    <div class="border-border border-t"></div>
                    <div>
                        <div class="mb-1.5 flex items-center justify-between">
                            <span class="text-muted-foreground text-sm">Jitter</span>
                            <span class="text-foreground font-mono text-sm font-semibold">
                                {jitterPercent}%
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            bind:value={jitterPercent}
                            class="w-full accent-[var(--brand-500,#ec4899)]"
                        />
                    </div>
                    <div class="border-border border-t"></div>
                    <div>
                        <span class="text-muted-foreground mb-2 block text-sm">Chunk mode</span>
                        <div class="flex gap-3">
                            {#each ['character', 'word', 'sentence'] as mode}
                                <label class="flex items-center gap-1.5 text-sm">
                                    <input
                                        type="radio"
                                        bind:group={chunkMode}
                                        value={mode}
                                        disabled={isStreaming}
                                        class="accent-[var(--brand-500,#ec4899)]"
                                    />
                                    <span class="text-foreground capitalize">{mode}</span>
                                </label>
                            {/each}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Live Metrics -->
            <div class="border-border bg-card rounded-xl border p-5 shadow-sm">
                <h3 class="text-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                    Live Metrics
                </h3>
                <div class="space-y-3">
                    {#if isStreaming || tokenCount > 0}
                        <!-- Progress bar -->
                        <div>
                            <div class="mb-1 flex items-center justify-between">
                                <span class="text-muted-foreground text-xs">Progress</span>
                                <span class="text-foreground font-mono text-xs font-semibold">
                                    {tokenCount} / {chunks.length}
                                </span>
                            </div>
                            <div class="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                                <div
                                    class="from-brand-500 to-brand-600 h-full rounded-full bg-gradient-to-r transition-all duration-150"
                                    style="width: {progress}%"
                                ></div>
                            </div>
                        </div>
                        <div class="border-border border-t"></div>
                    {/if}
                    <div class="flex items-center justify-between">
                        <span class="text-muted-foreground text-sm">Last render</span>
                        <span
                            class="font-mono text-sm font-semibold {lastRenderTime > 50
                                ? 'text-red-500'
                                : lastRenderTime > 16
                                  ? 'text-amber-500'
                                  : 'text-foreground'}"
                        >
                            {formatMs(lastRenderTime)}
                        </span>
                    </div>
                    <div class="border-border border-t"></div>
                    <div class="flex items-center justify-between">
                        <span class="text-muted-foreground text-sm">Average render</span>
                        <span
                            class="font-mono text-sm font-semibold {avgRenderTime > 50
                                ? 'text-red-500'
                                : avgRenderTime > 16
                                  ? 'text-amber-500'
                                  : 'text-foreground'}"
                        >
                            {formatMs(avgRenderTime)}
                        </span>
                    </div>
                    <div class="border-border border-t"></div>
                    <div class="flex items-center justify-between">
                        <span class="text-muted-foreground text-sm">Peak render</span>
                        <span
                            class="font-mono text-sm font-semibold {peakRenderTime > 50
                                ? 'text-red-500'
                                : peakRenderTime > 16
                                  ? 'text-amber-500'
                                  : 'text-foreground'}"
                        >
                            {formatMs(peakRenderTime)}
                        </span>
                    </div>
                    <div class="border-border border-t"></div>
                    <div class="flex items-center justify-between">
                        <span class="text-muted-foreground text-sm">Dropped frames</span>
                        <span
                            class="font-mono text-sm font-semibold {droppedFrames > 0
                                ? 'text-red-500'
                                : 'text-foreground'}"
                        >
                            {droppedFrames}
                        </span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Middle Column: Markdown Source (editable) -->
        <div class="h-[calc(100vh-14rem)] min-h-[400px] overflow-hidden xl:col-span-1">
            <div class="border-border bg-card flex h-full flex-col rounded-xl border p-5 shadow-sm">
                <div class="mb-3 flex items-center justify-between">
                    <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                        Markdown Source
                    </h3>
                    <div class="flex items-center gap-2">
                        <span class="text-muted-foreground text-xs">
                            {input.length} chars
                        </span>
                        <button
                            onclick={useDefault}
                            disabled={isStreaming}
                            class="border-border text-muted-foreground hover:text-foreground hover:border-brand-500/50 flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors disabled:opacity-50"
                        >
                            <RotateCcw class="size-3" />
                            Default
                        </button>
                    </div>
                </div>
                <p class="text-muted-foreground mb-3 text-xs">
                    Edit or paste your own markdown below. This content will be streamed
                    token-by-token when you click Start.
                </p>
                <textarea
                    bind:value={input}
                    disabled={isStreaming}
                    class="border-border bg-background text-foreground focus:ring-brand-500/50 min-h-0 flex-1 resize-none rounded-lg border p-4 font-mono text-xs focus:ring-2 focus:outline-none disabled:opacity-60"
                    spellcheck="false"
                    placeholder="Paste or type your markdown here..."
                ></textarea>
            </div>
        </div>

        <!-- Right Column: Rendered Output -->
        <div class="h-[calc(100vh-14rem)] min-h-[400px] overflow-hidden xl:col-span-1">
            <div
                class="border-border bg-card flex h-full min-h-0 flex-col rounded-xl border p-5 shadow-sm"
            >
                <div class="mb-3 flex shrink-0 items-center justify-between">
                    <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                        Rendered Output
                    </h3>
                    {#if isStreaming}
                        <span class="flex items-center gap-1.5 text-xs font-medium text-green-600">
                            <MonitorDot class="size-3 animate-pulse" />
                            Streaming...
                        </span>
                    {:else if tokenCount > 0 && tokenCount >= chunks.length}
                        <span class="text-muted-foreground text-xs">Complete</span>
                    {/if}
                </div>
                {#if source}
                    <div
                        bind:this={previewEl}
                        class="prose prose-sm dark:prose-invert min-h-0 max-w-none flex-1 overflow-y-auto"
                    >
                        <SvelteMarkdown {source} />
                    </div>
                {:else}
                    <div
                        class="text-muted-foreground flex flex-1 items-center justify-center text-sm italic"
                    >
                        Click "Start" to begin streaming the AI response.
                    </div>
                {/if}
            </div>
        </div>
    </div>
</div>
