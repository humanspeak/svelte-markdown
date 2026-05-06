<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { parseAndCacheTokens } from '$lib/utils/parse-and-cache.js'
    import { benchmarkAppendStream } from '$lib/utils/stream-benchmark.js'
    import { hashString, tokenCache } from '$lib/utils/token-cache.js'
    import { shrinkHtmlTokens } from '$lib/utils/token-cleanup.js'
    import { Lexer } from 'marked'
    import { onMount, tick } from 'svelte'

    /**
     * Performance baseline fixture for svelte-markdown.
     * Captures per-document parse/render timings and rolling-10s
     * observer metrics so optimization commits can be attributed to
     * a specific before/after delta. Modeled on the virtual-chat
     * perf-bench page; gauges differ to suit a parser/renderer.
     */

    const ROLLING_WINDOW_MS = 10_000
    const LONG_TASK_THRESHOLD_MS = 50

    // ---- Corpus generators ----------------------------------------------------

    const generateLarge = (sections: number, blocksPerSection: number): string => {
        const out: string[] = []
        for (let i = 0; i < sections; i++) {
            out.push(`# Section ${i}\n\n## Subsection ${i}.1\n`)
            for (let j = 0; j < blocksPerSection; j++) {
                out.push(`### Content Block ${i}.${j}

This is paragraph ${j} of section ${i}. It contains some **bold text** and *italic text*
and a [link to nowhere](https://example.com/${i}/${j}).

- List item 1
- List item 2
- List item 3

> Here's a blockquote for good measure.

\`\`\`javascript
// Some code
console.log('Section ${i}, Block ${j}');
\`\`\`
`)
            }
        }
        return out.join('\n')
    }

    const generateSmall = (): string =>
        `# Quick Example

A short paragraph with **bold**, *italic*, and a [link](https://example.com).

- one
- two
- three

\`\`\`ts
const x: number = 42
\`\`\`
`

    const generateHtmlHeavy = (rows: number): string => {
        const out: string[] = ['# HTML Heavy Corpus\n']
        for (let i = 0; i < rows; i++) {
            out.push(
                `<div class="card-${i}"><header><h3>Card ${i}</h3></header>` +
                    `<p>Paragraph <strong>${i}</strong> with <em>nested</em> ` +
                    `<a href="https://example.com/${i}">link</a> and <code>inline ${i}</code>.</p>` +
                    `<ul><li>row ${i}.a</li><li>row ${i}.b</li><li>row ${i}.c</li></ul>` +
                    `<footer><small>id=${i}</small><br/></footer></div>\n`
            )
        }
        return out.join('\n')
    }

    const generateTableHeavy = (tables: number): string => {
        const out: string[] = ['# Table Heavy Corpus\n']
        for (let i = 0; i < tables; i++) {
            out.push(`## Table ${i}\n`)
            out.push('| Col A | Col B | Col C | Col D |')
            out.push('|-------|-------|-------|-------|')
            for (let r = 0; r < 12; r++) {
                out.push(
                    `| **a${i}.${r}** | _b${i}.${r}_ | \`c${i}.${r}\` | [d${i}.${r}](https://x/${r}) |`
                )
            }
            out.push('')
        }
        return out.join('\n')
    }

    // 1500-char streaming corpus reused from /test/streaming
    const STREAM_CORPUS = `# Reactive Systems

Reactive programming is a **declarative paradigm** for _data streams_ and propagation of change.

## Core Principles

1. **Observables** — represent a stream of data over time
2. **Operators** — transform, filter, and combine streams
3. **Subscribers** — consume the final output

> "The best way to predict the future is to invent it." — Alan Kay

### Example

\`\`\`javascript
import { writable } from 'svelte/store'
const count = writable(0)
count.subscribe(value => console.log(\`Count: \${value}\`))
count.update(n => n + 1)
\`\`\`

## Comparison Table

| Feature | Svelte | React | Vue |
|---------|--------|-------|-----|
| Reactivity | Compile-time | Runtime | Runtime |
| Bundle Size | Small | Medium | Medium |
| Performance | Excellent | Good | Good |

## Patterns

- Reactive primitives
  - Signals
  - Computed
- State management
  - Local state
  - Stores

## Conclusion

For more, see the [Svelte docs](https://svelte.dev/docs).

---

*Thanks for reading.*
`

    // ---- Per-scenario reactive state -----------------------------------------

    let source = $state('')
    let previewEl: HTMLDivElement | undefined = $state()
    let scenario = $state<string>('idle')

    let stat = $state({
        srcKb: 0,
        tokenCount: 0,
        parseColdMs: 0,
        parseWarmMs: 0,
        lexMs: 0,
        cleanupMs: 0,
        hashMs: 0,
        firstPaintMs: 0,
        domNodes: 0,
        charsPerSec: 0,
        // cache scenario
        cacheIters: 0,
        cacheTotalMs: 0,
        cacheAvgMs: 0,
        cacheP95Ms: 0,
        cachePeakMs: 0,
        // streaming scenario
        streamChunks: 0,
        streamTotalMs: 0,
        streamAvgMs: 0,
        streamP95Ms: 0,
        streamPeakMs: 0,
        chunksPerSec: 0,
        // streaming-only pure-parse percentiles (independent of wall-clock pacing)
        parseChunkAvgMs: 0,
        parseChunkP95Ms: 0,
        parseChunkPeakMs: 0
    })

    // ---- Rolling-10s observer state ------------------------------------------

    let displayLongestTaskMs = $state(0)
    let displayLongTaskCount = $state(0)
    let displayRafP95Ms = $state(0)
    let displayMutationCount = $state(0)
    let displayLoafCount = $state(0)
    let displayLoafScriptMaxMs = $state(0)
    let displayHeapAllocKbPerSec = $state(0)
    let longTaskSupported = $state(true)
    let loafSupported = $state(true)
    let heapSupported = $state(true)

    let longTaskEntries: { time: number; duration: number }[] = []
    let rafIntervals: { time: number; delta: number }[] = []
    let mutationEvents: { time: number; count: number }[] = []
    let loafEntries: { time: number; durationMs: number; scriptMs: number }[] = []
    let heapDeltas: { time: number; deltaBytes: number }[] = []

    let isStreaming = $state(false)
    let streamHandle: ReturnType<typeof setTimeout> | null = null

    // ---- Helpers --------------------------------------------------------------

    const percentile = (values: number[], p: number): number => {
        if (values.length === 0) return 0
        const sorted = [...values].sort((a, b) => a - b)
        const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))
        return sorted[idx]
    }

    const round = (n: number, places = 2): number => {
        const m = 10 ** places
        return Math.round(n * m) / m
    }

    const resetStat = () => {
        stat = {
            srcKb: 0,
            tokenCount: 0,
            parseColdMs: 0,
            parseWarmMs: 0,
            lexMs: 0,
            cleanupMs: 0,
            hashMs: 0,
            firstPaintMs: 0,
            domNodes: 0,
            charsPerSec: 0,
            cacheIters: 0,
            cacheTotalMs: 0,
            cacheAvgMs: 0,
            cacheP95Ms: 0,
            cachePeakMs: 0,
            streamChunks: 0,
            streamTotalMs: 0,
            streamAvgMs: 0,
            streamP95Ms: 0,
            streamPeakMs: 0,
            chunksPerSec: 0,
            parseChunkAvgMs: 0,
            parseChunkP95Ms: 0,
            parseChunkPeakMs: 0
        }
    }

    /**
     * Resolves on the next MutationObserver fire on the preview element,
     * returning the timestamp of that fire. Used to measure end-to-end
     * source-set → DOM-commit latency for `firstPaintMs`.
     */
    const waitForPaint = (): Promise<number> => {
        return new Promise((resolve) => {
            if (!previewEl) {
                resolve(performance.now())
                return
            }
            const mo = new MutationObserver(() => {
                mo.disconnect()
                resolve(performance.now())
            })
            mo.observe(previewEl, { childList: true, subtree: true, characterData: true })
        })
    }

    /**
     * Runs the full per-document timing suite for a given corpus.
     * Updates `stat` with parse/lex/cleanup/hash + first-paint metrics
     * and assigns `source` so the live preview re-renders.
     */
    const runDocScenario = async (label: string, corpus: string) => {
        scenario = label
        resetStat()

        // Direct timings (synchronous, no render in loop)
        tokenCache.clearAllTokens()
        const opts = { gfm: true, breaks: false, headerIds: true, headerPrefix: '' }

        const tCold0 = performance.now()
        const cold = parseAndCacheTokens(corpus, opts, false)
        const parseColdMs = performance.now() - tCold0

        const tWarm0 = performance.now()
        parseAndCacheTokens(corpus, opts, false)
        const parseWarmMs = performance.now() - tWarm0

        // Isolated lex + cleanup (fresh cache, fresh tokens)
        tokenCache.clearAllTokens()
        const tLex0 = performance.now()
        const rawTokens = new Lexer(opts).lex(corpus)
        const lexMs = performance.now() - tLex0
        const tClean0 = performance.now()
        shrinkHtmlTokens(rawTokens as never)
        const cleanupMs = performance.now() - tClean0

        const tHash0 = performance.now()
        hashString(corpus)
        const hashMs = performance.now() - tHash0

        // Render path (clear cache so the component re-parses cold)
        tokenCache.clearAllTokens()
        source = ''
        await tick()
        const paintPromise = waitForPaint()
        const tPaint0 = performance.now()
        source = corpus
        const paintAt = await paintPromise
        const firstPaintMs = paintAt - tPaint0

        await tick()
        const domNodes = previewEl ? previewEl.querySelectorAll('*').length : 0

        const srcKb = round(corpus.length / 1024, 1)
        const charsPerSec = parseColdMs > 0 ? Math.round((corpus.length / parseColdMs) * 1000) : 0

        stat = {
            ...stat,
            srcKb,
            tokenCount: cold.length,
            parseColdMs: round(parseColdMs),
            parseWarmMs: round(parseWarmMs, 3),
            lexMs: round(lexMs),
            cleanupMs: round(cleanupMs),
            hashMs: round(hashMs, 3),
            firstPaintMs: round(firstPaintMs),
            domNodes,
            charsPerSec
        }

        scenario = `${label}-done`
    }

    /**
     * Cache-hit benchmark: parses the same source N times in a tight loop
     * after one cold parse. Subsequent calls should be sub-millisecond
     * cache hits; this scenario surfaces overhead in `getCacheKey` /
     * `hashString` / WeakMap lookup.
     */
    const runCacheWarm = (iterations = 100) => {
        scenario = 'cache-warm'
        resetStat()
        const corpus = generateLarge(50, 5) // ~25KB, modest
        const opts = { gfm: true, breaks: false, headerIds: true, headerPrefix: '' }

        // Prime the cache with one cold parse, not counted
        tokenCache.clearAllTokens()
        parseAndCacheTokens(corpus, opts, false)

        const durations: number[] = []
        for (let i = 0; i < iterations; i++) {
            const t0 = performance.now()
            parseAndCacheTokens(corpus, opts, false)
            durations.push(performance.now() - t0)
        }

        const total = durations.reduce((s, d) => s + d, 0)
        stat = {
            ...stat,
            srcKb: round(corpus.length / 1024, 1),
            cacheIters: iterations,
            cacheTotalMs: round(total),
            cacheAvgMs: round(total / iterations, 3),
            cacheP95Ms: round(percentile(durations, 0.95), 3),
            cachePeakMs: round(Math.max(...durations), 3)
        }
        source = corpus
        scenario = 'cache-warm-done'
    }

    /**
     * Real-time streaming scenario. Word-chunks the corpus, appends one
     * chunk per tick at ~30 chunks/sec, and times each parse+render
     * cycle. The live SvelteMarkdown component is mounted in streaming
     * mode so the IncrementalParser is exercised. Rolling observers
     * pick up longtasks/rAF/mutations during the run.
     */
    const runStreaming = async (chunksPerSecondTarget = 30) => {
        if (isStreaming) return
        scenario = 'stream-30tps'
        resetStat()
        source = ''
        tokenCache.clearAllTokens()
        await tick()

        const chunks: string[] = []
        const re = /\S+\s*/g
        let match
        while ((match = re.exec(STREAM_CORPUS)) !== null) chunks.push(match[0])

        // Up-front pure-parse benchmark for percentiles independent of
        // wall-clock pacing. Doesn't touch the live component.
        const opts = { gfm: true, breaks: false, headerIds: true, headerPrefix: '' }
        const bench = benchmarkAppendStream(chunks, opts)

        // Real-time replay against the mounted component
        const baseDelay = 1000 / chunksPerSecondTarget
        const renderDurations: number[] = []
        let i = 0
        isStreaming = true
        const startWall = performance.now()
        await new Promise<void>((resolve) => {
            const step = async () => {
                if (i >= chunks.length) {
                    resolve()
                    return
                }
                const t0 = performance.now()
                source += chunks[i]
                i++
                await tick()
                renderDurations.push(performance.now() - t0)
                streamHandle = setTimeout(step, baseDelay)
            }
            void step()
        })
        const wallMs = performance.now() - startWall
        isStreaming = false
        if (streamHandle !== null) {
            clearTimeout(streamHandle)
            streamHandle = null
        }

        const renderTotal = renderDurations.reduce((s, d) => s + d, 0)
        stat = {
            ...stat,
            srcKb: round(STREAM_CORPUS.length / 1024, 1),
            streamChunks: chunks.length,
            streamTotalMs: round(renderTotal),
            streamAvgMs: round(renderTotal / chunks.length, 3),
            streamP95Ms: round(percentile(renderDurations, 0.95), 3),
            streamPeakMs: round(Math.max(...renderDurations), 3),
            chunksPerSec: round((chunks.length / wallMs) * 1000, 1),
            parseChunkAvgMs: round(bench.totalParseMs / bench.chunkCount, 3),
            parseChunkP95Ms: round(bench.p95ParseMs, 3),
            parseChunkPeakMs: round(bench.peakParseMs, 3)
        }
        scenario = 'stream-30tps-done'
    }

    const clear = () => {
        if (streamHandle !== null) {
            clearTimeout(streamHandle)
            streamHandle = null
        }
        isStreaming = false
        source = ''
        tokenCache.clearAllTokens()
        resetStat()
        longTaskEntries = []
        rafIntervals = []
        mutationEvents = []
        loafEntries = []
        heapDeltas = []
        displayLongestTaskMs = 0
        displayLongTaskCount = 0
        displayRafP95Ms = 0
        displayMutationCount = 0
        displayLoafCount = 0
        displayLoafScriptMaxMs = 0
        displayHeapAllocKbPerSec = 0
        scenario = 'idle'
    }

    // ---- Observer wiring (verbatim from virtual-chat, adapted target) --------

    onMount(() => {
        const cleanups: Array<() => void> = []

        try {
            const po = new PerformanceObserver((list) => {
                const now = performance.now()
                for (const entry of list.getEntries()) {
                    longTaskEntries.push({ time: now, duration: entry.duration })
                }
            })
            po.observe({ entryTypes: ['longtask'] })
            cleanups.push(() => po.disconnect())
        } catch {
            longTaskSupported = false
        }

        try {
            type ScriptTiming = { duration: number }
            type LongAnimationFrameTiming = PerformanceEntry & { scripts?: ScriptTiming[] }
            const po = new PerformanceObserver((list) => {
                const now = performance.now()
                for (const raw of list.getEntries()) {
                    const entry = raw as LongAnimationFrameTiming
                    let scriptMs = 0
                    if (entry.scripts) {
                        for (const s of entry.scripts) scriptMs += s.duration
                    }
                    loafEntries.push({ time: now, durationMs: entry.duration, scriptMs })
                }
            })
            po.observe({ type: 'long-animation-frame', buffered: true })
            cleanups.push(() => po.disconnect())
        } catch {
            loafSupported = false
        }

        const wrapper = document.querySelector('[data-testid="perf-preview"]')
        if (wrapper) {
            const mo = new MutationObserver((records) => {
                mutationEvents.push({ time: performance.now(), count: records.length })
            })
            mo.observe(wrapper, { childList: true, subtree: true, characterData: true })
            cleanups.push(() => mo.disconnect())
        }

        type MemoryInfo = { usedJSHeapSize: number }
        type PerformanceWithMemory = Performance & { memory?: MemoryInfo }
        const perfMem = (performance as PerformanceWithMemory).memory
        if (!perfMem) heapSupported = false

        let rafId = 0
        let lastRaf = performance.now()
        let firstSampleSeen = false
        let lastHeapBytes = perfMem?.usedJSHeapSize ?? 0
        const tickRaf = (now: number) => {
            const delta = now - lastRaf
            lastRaf = now
            if (firstSampleSeen) {
                rafIntervals.push({ time: now, delta })
                if (perfMem) {
                    const current = perfMem.usedJSHeapSize
                    const heapDelta = current - lastHeapBytes
                    if (heapDelta > 0) heapDeltas.push({ time: now, deltaBytes: heapDelta })
                    lastHeapBytes = current
                }
            } else {
                firstSampleSeen = true
            }
            rafId = requestAnimationFrame(tickRaf)
        }
        rafId = requestAnimationFrame(tickRaf)
        cleanups.push(() => cancelAnimationFrame(rafId))

        const refreshHandle = setInterval(() => {
            const now = performance.now()
            const cutoff = now - ROLLING_WINDOW_MS

            longTaskEntries = longTaskEntries.filter((e) => e.time >= cutoff)
            rafIntervals = rafIntervals.filter((e) => e.time >= cutoff)
            mutationEvents = mutationEvents.filter((e) => e.time >= cutoff)
            loafEntries = loafEntries.filter((e) => e.time >= cutoff)
            heapDeltas = heapDeltas.filter((e) => e.time >= cutoff)

            let longest = 0
            let longCount = 0
            for (const e of longTaskEntries) {
                if (e.duration > longest) longest = e.duration
                if (e.duration > LONG_TASK_THRESHOLD_MS) longCount++
            }
            displayLongestTaskMs = Math.round(longest)
            displayLongTaskCount = longCount

            if (rafIntervals.length > 0) {
                const sorted = rafIntervals.map((e) => e.delta).sort((a, b) => a - b)
                const idx = Math.floor(0.95 * sorted.length)
                displayRafP95Ms = Math.round(sorted[Math.min(idx, sorted.length - 1)] * 10) / 10
            } else {
                displayRafP95Ms = 0
            }

            let mutCount = 0
            for (const e of mutationEvents) mutCount += e.count
            displayMutationCount = mutCount

            let loafScriptMax = 0
            for (const e of loafEntries) {
                if (e.scriptMs > loafScriptMax) loafScriptMax = e.scriptMs
            }
            displayLoafCount = loafEntries.length
            displayLoafScriptMaxMs = Math.round(loafScriptMax)

            if (heapSupported) {
                let totalBytes = 0
                for (const e of heapDeltas) totalBytes += e.deltaBytes
                const seconds = ROLLING_WINDOW_MS / 1000
                displayHeapAllocKbPerSec = Math.round(totalBytes / 1024 / seconds)
            } else {
                displayHeapAllocKbPerSec = 0
            }
        }, 250)
        cleanups.push(() => clearInterval(refreshHandle))

        return () => {
            for (const fn of cleanups) fn()
        }
    })
</script>

<svelte:head>
    <title>Test: Perf bench</title>
</svelte:head>

<div class="page">
    <h1>Test: Perf bench</h1>
    <p class="lede">
        Captures per-document parse/render timings and rolling-10s observer metrics. Each preset
        clears the token cache, runs the scenario, and updates the stats line. Use as a baseline
        before/after parser optimization commits.
    </p>

    <div class="presets">
        <button
            data-testid="parse-1kb"
            onclick={() => runDocScenario('parse-1kb', generateSmall())}
        >
            Parse 1KB
        </button>
        <button
            data-testid="parse-50kb"
            onclick={() => runDocScenario('parse-50kb', generateLarge(16, 10))}
        >
            Parse ~50KB
        </button>
        <button
            data-testid="parse-500kb"
            onclick={() => runDocScenario('parse-500kb', generateLarge(165, 10))}
        >
            Parse ~500KB
        </button>
        <button
            data-testid="parse-html-heavy"
            onclick={() => runDocScenario('parse-html-heavy', generateHtmlHeavy(500))}
        >
            Parse HTML-heavy
        </button>
        <button
            data-testid="parse-table-heavy"
            onclick={() => runDocScenario('parse-table-heavy', generateTableHeavy(40))}
        >
            Parse table-heavy
        </button>
        <button data-testid="cache-warm" onclick={() => runCacheWarm(100)}>Cache warm ×100</button>
        <button data-testid="stream-30tps" onclick={() => runStreaming(30)} disabled={isStreaming}>
            {isStreaming ? 'Streaming…' : 'Stream 30/s'}
        </button>
        <button data-testid="clear" onclick={clear}>Clear</button>
    </div>

    <div class="stats" data-testid="perf-stats">
        scenario={scenario} srcKb={stat.srcKb} tokenCount={stat.tokenCount} parseColdMs={stat.parseColdMs}
        parseWarmMs={stat.parseWarmMs} lexMs={stat.lexMs} cleanupMs={stat.cleanupMs} hashMs={stat.hashMs}
        firstPaintMs={stat.firstPaintMs} domNodes={stat.domNodes} charsPerSec={stat.charsPerSec} · cacheIters={stat.cacheIters}
        cacheTotalMs={stat.cacheTotalMs} cacheAvgMs={stat.cacheAvgMs}
        cacheP95Ms={stat.cacheP95Ms} cachePeakMs={stat.cachePeakMs} · streamChunks={stat.streamChunks}
        streamTotalMs={stat.streamTotalMs} streamAvgMs={stat.streamAvgMs} streamP95Ms={stat.streamP95Ms}
        streamPeakMs={stat.streamPeakMs} chunksPerSec={stat.chunksPerSec} parseChunkAvgMs={stat.parseChunkAvgMs}
        parseChunkP95Ms={stat.parseChunkP95Ms} parseChunkPeakMs={stat.parseChunkPeakMs} · longestTaskMs={longTaskSupported
            ? displayLongestTaskMs
            : 'n/a'}
        longTasks10s={longTaskSupported ? displayLongTaskCount : 'n/a'} rafP95Ms={displayRafP95Ms}
        mutations10s={displayMutationCount} loaf10s={loafSupported ? displayLoafCount : 'n/a'}
        loafScriptMaxMs={loafSupported ? displayLoafScriptMaxMs : 'n/a'} heapAllocKbPerSec={heapSupported
            ? displayHeapAllocKbPerSec
            : 'n/a'}
    </div>

    <div class="preview" data-testid="perf-preview" bind:this={previewEl}>
        <SvelteMarkdown {source} streaming={isStreaming} />
    </div>
</div>

<style>
    .page {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        padding: 1rem;
        height: 100vh;
        box-sizing: border-box;
    }
    h1 {
        margin: 0;
        font-size: 1.1rem;
    }
    .lede {
        margin: 0;
        font-size: 0.85rem;
        color: #555;
    }
    .presets {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }
    .presets button {
        padding: 0.4rem 0.75rem;
        font-size: 0.85rem;
        border: 1px solid #cbd5e0;
        border-radius: 0.25rem;
        background: #edf2f7;
        cursor: pointer;
    }
    .presets button:hover:not(:disabled) {
        background: #e2e8f0;
    }
    .presets button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    .stats {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.7rem;
        color: #2d3748;
        background: #f7fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        padding: 0.5rem 0.75rem;
        line-height: 1.5;
        word-break: break-word;
    }
    .preview {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        padding: 0.75rem;
        background: white;
    }
</style>
