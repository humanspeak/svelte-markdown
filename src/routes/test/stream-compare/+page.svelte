<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import {
        STREAM_FLUSH_MEASURE,
        STREAM_FLUSH_PROFILE_FLAG
    } from '$lib/utils/stream-flush-profile.js'
    import { Streamdown } from 'svelte-streamdown'
    import { tick } from 'svelte'

    /**
     * Streaming renderer comparison benchmark.
     *
     * Method — what is measured and why:
     *
     * Every scenario streams a cumulative `content` string, one or more
     * updates per animation frame, the way a chat UI does when it re-assigns
     * the growing message on each model token. Per frame we record the
     * main-thread WORK the update caused, not wall-clock latency:
     *
     *   syncMs       time spent inside `content = ...; await tick()` — this is
     *                where a renderer that updates synchronously does its
     *                parsing and DOM commit.
     *   frameWorkMs  time from the frame's rAF timestamp until our own rAF
     *                callback runs, plus a forced style/layout read. A
     *                renderer that defers to the next frame (Svelte Markdown's
     *                rAF coalescing) does its parse + DOM commit here, before
     *                our callback because it registered its rAF first.
     *   workMs       syncMs + frameWorkMs — the per-frame cost a host app pays.
     *
     * Earlier versions of this page measured only `syncMs` in a synchronous
     * burst loop. For a renderer that defers to rAF that is ~0 regardless of
     * document size (all work landed in one "settle" frame), and in frame-paced
     * mode the number collapsed to the 60 Hz frame period. Neither reflected
     * per-chunk cost, so those numbers were retired.
     *
     * For Svelte Markdown we additionally read its opt-in User Timing measure
     * (`svelte-markdown:stream-flush`, parse + diff + state write only) as a
     * cross-check; it is reported as `libraryFlushMs` and is `null` for the
     * competitor, which exposes no equivalent hook.
     *
     * Corpora mirror common LLM output shapes: mixed prose, one long bullet
     * list (a single block that stays open until the end), one long code fence
     * (same), and a citation-heavy answer with `[n]` markers and a trailing
     * `[n]: url` definitions block.
     */

    type Renderer = 'svelte-markdown' | 'svelte-streamdown'
    type CorpusKind = 'prose-mixed' | 'long-list' | 'long-code-fence' | 'citations'

    interface Scenario {
        id: string
        corpus: CorpusKind
        targetBytes: number
        /** Characters appended per update. */
        chunkSize: number
        /** Cumulative prop assignments per animation frame. */
        updatesPerFrame: number
    }

    interface RunResult {
        renderer: Renderer
        scenario: string
        corpus: CorpusKind
        sourceBytes: number
        chunkSize: number
        updatesPerFrame: number
        frames: number
        totalWorkMs: number
        avgWorkMs: number
        p50WorkMs: number
        p95WorkMs: number
        p99WorkMs: number
        peakWorkMs: number
        /** Frames whose work exceeded a 60 Hz budget (16.7 ms). */
        framesOverBudget: number
        /** Work of the first vs. last fifth of frames; > 1 means cost grows with document length. */
        growthRatio: number
        syncTotalMs: number
        frameWorkTotalMs: number
        libraryFlushMs: number | null
        libraryFlushCount: number | null
        domNodes: number
        mutations: number
        heapDeltaKb: number | null
        outputHash: string
        outputLength: number
    }

    interface BenchWindow extends Window {
        __streamBenchmark?: {
            scenarios: Scenario[]
            run: (_renderer: Renderer, _scenarioId: string) => Promise<RunResult>
            clear: () => Promise<void>
        }
        [STREAM_FLUSH_PROFILE_FLAG]?: boolean
    }

    interface PerformanceWithMemory extends Performance {
        memory?: { usedJSHeapSize: number }
    }

    const FRAME_BUDGET_MS = 1000 / 60

    // 32 chars/frame ≈ 480 tokens/s at 60 fps — a fast model, and a fixed
    // per-frame input so both renderers see identical work.
    const scenarios: Scenario[] = [
        {
            id: 'prose-mixed',
            corpus: 'prose-mixed',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1
        },
        {
            id: 'prose-mixed-4x',
            corpus: 'prose-mixed',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 4
        },
        {
            id: 'long-list',
            corpus: 'long-list',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1
        },
        {
            id: 'long-code-fence',
            corpus: 'long-code-fence',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1
        },
        {
            id: 'citations',
            corpus: 'citations',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1
        }
    ]

    let activeRenderer = $state<Renderer | null>(null)
    let content = $state('')
    let outputElement = $state<HTMLElement>()
    let status = $state('ready')
    let lastResult = $state<RunResult | null>(null)

    // ---- Corpora ------------------------------------------------------------

    const section = (index: number): string => `## Section ${index}: Streaming performance

This paragraph contains **bold text**, *emphasis*, \`inline code\`, and a
[stable link](https://example.com/${index}) so each renderer performs realistic inline work.

- Item ${index}.1 with a short explanation
- Item ${index}.2 with another **formatted value**
- Item ${index}.3 with a nested detail
  - Nested ${index}.a
  - Nested ${index}.b

> A blockquote for section ${index} keeps the block shapes varied.

\`\`\`ts
const section${index} = { active: true, value: ${index} }
\`\`\`

| Metric | Value |
| --- | ---: |
| section | ${index} |
| doubled | ${index * 2} |

`

    const makeProseMixed = (targetBytes: number): string => {
        let source = '# Long streaming benchmark\n\n'
        let index = 0
        while (source.length < targetBytes) source += section(index++)
        return source
    }

    /** One bullet list that stays a single open block until the closing paragraph. */
    const makeLongList = (targetBytes: number): string => {
        let source = '# Release notes\n\nEvery change in this release, in order:\n\n'
        let index = 1
        while (source.length < targetBytes) {
            source += `- **Change ${index}**: fixed \`module${index}\` in the [renderer](https://example.com/change/${index}) so value ${index} is computed once and reused.\n`
            index++
        }
        return `${source}\nThat is every change.\n`
    }

    /** One fenced code block that stays open until the closing fence. */
    const makeLongCodeFence = (targetBytes: number): string => {
        let source = 'Here is the full implementation you asked for:\n\n```ts\n'
        let index = 0
        while (source.length < targetBytes) {
            source += `export const value${index} = compute(${index}, 'label-${index}') // step ${index}\n`
            index++
        }
        return `${source}\`\`\`\n\nLet me know if you want it split into modules.\n`
    }

    /** Prose with `[n]` citation markers and a trailing definitions block. */
    const makeCitations = (targetBytes: number): string => {
        const sourceCount = 40
        let definitions = '## Sources\n\n'
        for (let index = 1; index <= sourceCount; index++) {
            definitions += `[${index}]: https://example.com/source/${index}\n`
        }

        let body = '# Findings\n\n'
        let paragraph = 0
        while (body.length + definitions.length < targetBytes) {
            const a = (paragraph % sourceCount) + 1
            const b = ((paragraph + 7) % sourceCount) + 1
            body += `Paragraph ${paragraph} summarises the **${a}th** result and its *follow-up* [${a}] before contrasting it with the replication study [${b}], which reported a slightly different \`effect\` size.\n\n`
            paragraph++
        }

        return body + definitions
    }

    const makeCorpus = (kind: CorpusKind, targetBytes: number): string => {
        switch (kind) {
            case 'prose-mixed':
                return makeProseMixed(targetBytes)
            case 'long-list':
                return makeLongList(targetBytes)
            case 'long-code-fence':
                return makeLongCodeFence(targetBytes)
            case 'citations':
                return makeCitations(targetBytes)
        }
    }

    // ---- Helpers ------------------------------------------------------------

    const percentile = (sorted: number[], fraction: number): number => {
        if (sorted.length === 0) return 0
        return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
    }

    const round = (value: number): number => Math.round(value * 1000) / 1000

    const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0)

    const hashText = (value: string): string => {
        let hash = 0x811c9dc5
        for (let index = 0; index < value.length; index++) {
            hash ^= value.charCodeAt(index)
            hash = Math.imul(hash, 0x01000193)
        }
        return (hash >>> 0).toString(16).padStart(8, '0')
    }

    const readHeap = (): number | null =>
        (performance as PerformanceWithMemory).memory?.usedJSHeapSize ?? null

    const nextFrame = (): Promise<DOMHighResTimeStamp> =>
        new Promise((resolve) => requestAnimationFrame((timestamp) => resolve(timestamp)))

    const clear = async (): Promise<void> => {
        activeRenderer = null
        content = ''
        lastResult = null
        await tick()
        await nextFrame()
    }

    /**
     * Applies one frame's worth of updates and returns the main-thread work it
     * caused. See the module comment for the definition of each component.
     */
    const measureFrame = async (
        slices: string[]
    ): Promise<{ syncMs: number; frameWorkMs: number }> => {
        let syncMs = 0
        for (const slice of slices) {
            const startedAt = performance.now()
            content = slice
            await tick()
            syncMs += performance.now() - startedAt
        }

        const frameTimestamp = await nextFrame()
        // Force style + layout so DOM-heavy output is charged to the renderer
        // that produced it, rather than to whichever frame paints next.
        outputElement?.getBoundingClientRect()
        const frameWorkMs = Math.max(0, performance.now() - frameTimestamp)

        return { syncMs, frameWorkMs }
    }

    const run = async (renderer: Renderer, scenarioId: string): Promise<RunResult> => {
        const scenario = scenarios.find((candidate) => candidate.id === scenarioId)
        if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`)

        await clear()
        status = `running ${renderer} / ${scenario.id}`
        activeRenderer = renderer
        await tick()

        const benchWindow = window as BenchWindow
        benchWindow[STREAM_FLUSH_PROFILE_FLAG] = renderer === 'svelte-markdown'
        performance.clearMeasures(STREAM_FLUSH_MEASURE)

        const source = makeCorpus(scenario.corpus, scenario.targetBytes)
        const slices: string[] = []
        for (
            let offset = scenario.chunkSize;
            offset < source.length;
            offset += scenario.chunkSize
        ) {
            slices.push(source.slice(0, offset))
        }
        slices.push(source)

        const workMs: number[] = []
        const syncMsSamples: number[] = []
        const frameWorkMsSamples: number[] = []
        let mutations = 0
        const observer = new MutationObserver((records) => {
            mutations += records.length
        })
        if (outputElement) observer.observe(outputElement, { childList: true, subtree: true })

        const heapBefore = readHeap()
        for (let index = 0; index < slices.length; index += scenario.updatesPerFrame) {
            const frameSlices = slices.slice(index, index + scenario.updatesPerFrame)
            const { syncMs, frameWorkMs } = await measureFrame(frameSlices)
            syncMsSamples.push(syncMs)
            frameWorkMsSamples.push(frameWorkMs)
            workMs.push(syncMs + frameWorkMs)
        }
        // One idle frame so any deferred commit from the last update is charged.
        const trailing = await measureFrame([source])
        workMs[workMs.length - 1] += trailing.syncMs + trailing.frameWorkMs
        frameWorkMsSamples[frameWorkMsSamples.length - 1] += trailing.frameWorkMs
        syncMsSamples[syncMsSamples.length - 1] += trailing.syncMs

        const heapAfter = readHeap()
        observer.disconnect()
        benchWindow[STREAM_FLUSH_PROFILE_FLAG] = false

        const flushEntries = performance.getEntriesByName(STREAM_FLUSH_MEASURE, 'measure')
        performance.clearMeasures(STREAM_FLUSH_MEASURE)

        const sorted = [...workMs].sort((a, b) => a - b)
        const fifth = Math.max(1, Math.floor(workMs.length / 5))
        const firstFifth = sum(workMs.slice(0, fifth)) / fifth
        const lastFifth = sum(workMs.slice(workMs.length - fifth)) / fifth
        const outputText = (outputElement?.textContent ?? '').replace(/\s+/g, ' ').trim()

        const result: RunResult = {
            renderer,
            scenario: scenario.id,
            corpus: scenario.corpus,
            sourceBytes: source.length,
            chunkSize: scenario.chunkSize,
            updatesPerFrame: scenario.updatesPerFrame,
            frames: workMs.length,
            totalWorkMs: round(sum(workMs)),
            avgWorkMs: round(sum(workMs) / workMs.length),
            p50WorkMs: round(percentile(sorted, 0.5)),
            p95WorkMs: round(percentile(sorted, 0.95)),
            p99WorkMs: round(percentile(sorted, 0.99)),
            peakWorkMs: round(sorted.at(-1) ?? 0),
            framesOverBudget: workMs.filter((value) => value > FRAME_BUDGET_MS).length,
            growthRatio: firstFifth > 0 ? round(lastFifth / firstFifth) : 0,
            syncTotalMs: round(sum(syncMsSamples)),
            frameWorkTotalMs: round(sum(frameWorkMsSamples)),
            libraryFlushMs:
                renderer === 'svelte-markdown'
                    ? round(sum(flushEntries.map((entry) => entry.duration)))
                    : null,
            libraryFlushCount: renderer === 'svelte-markdown' ? flushEntries.length : null,
            domNodes: outputElement?.querySelectorAll('*').length ?? 0,
            mutations,
            heapDeltaKb:
                heapBefore === null || heapAfter === null
                    ? null
                    : round((heapAfter - heapBefore) / 1024),
            outputHash: hashText(outputText),
            outputLength: outputText.length
        }
        lastResult = result
        status = 'ready'
        return result
    }

    $effect(() => {
        if (typeof window === 'undefined') return
        ;(window as BenchWindow).__streamBenchmark = { scenarios, run, clear }
        return () => {
            delete (window as BenchWindow).__streamBenchmark
        }
    })
</script>

<svelte:head><title>Streaming renderer comparison benchmark</title></svelte:head>

<main>
    <h1>Streaming renderer comparison benchmark</h1>
    <p data-testid="benchmark-status">{status}</p>
    <div class="actions">
        {#each scenarios as scenario (scenario.id)}
            <button onclick={() => run('svelte-markdown', scenario.id)}>
                Svelte Markdown · {scenario.id}
            </button>
            <button onclick={() => run('svelte-streamdown', scenario.id)}>
                Svelte Streamdown · {scenario.id}
            </button>
        {/each}
        <button onclick={clear}>Clear</button>
    </div>

    {#if lastResult}
        <pre data-testid="benchmark-result">{JSON.stringify(lastResult, null, 2)}</pre>
    {/if}

    <section class="output" data-testid="benchmark-output" bind:this={outputElement}>
        {#if activeRenderer === 'svelte-markdown'}
            <SvelteMarkdown source={content} streaming />
        {:else if activeRenderer === 'svelte-streamdown'}
            <Streamdown
                {content}
                animation={{ enabled: false }}
                controls={{ code: false, mermaid: false, table: false }}
            />
        {/if}
    </section>
</main>

<style>
    main {
        margin: 0 auto;
        max-width: 80rem;
        padding: 1.5rem;
        font-family: system-ui, sans-serif;
    }
    .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-block: 1rem;
    }
    button {
        padding: 0.45rem 0.7rem;
    }
    .output {
        contain: layout style;
    }
</style>
