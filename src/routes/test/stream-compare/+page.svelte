<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { Streamdown } from 'svelte-streamdown'
    import { tick } from 'svelte'

    type Renderer = 'svelte-markdown' | 'svelte-streamdown'

    interface Scenario {
        id: string
        targetBytes: number
        chunkSize: number
        mode: 'burst' | 'frame-paced'
    }

    interface RunResult {
        renderer: Renderer
        scenario: string
        sourceBytes: number
        chunkSize: number
        chunks: number
        totalMs: number
        avgMs: number
        p50Ms: number
        p95Ms: number
        p99Ms: number
        peakMs: number
        settleMs: number
        chunksPerSec: number
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
    }

    interface PerformanceWithMemory extends Performance {
        memory?: { usedJSHeapSize: number }
    }

    const scenarios: Scenario[] = [
        { id: '10kb-tiny-chunks', targetBytes: 10_000, chunkSize: 16, mode: 'burst' },
        { id: '50kb-small-chunks', targetBytes: 50_000, chunkSize: 64, mode: 'burst' },
        { id: '200kb-medium-chunks', targetBytes: 200_000, chunkSize: 256, mode: 'burst' },
        { id: '50kb-frame-paced', targetBytes: 50_000, chunkSize: 512, mode: 'frame-paced' }
    ]

    let activeRenderer = $state<Renderer | null>(null)
    let content = $state('')
    let outputElement = $state<HTMLElement>()
    let status = $state('ready')
    let lastResult = $state<RunResult | null>(null)

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

    const makeCorpus = (targetBytes: number): string => {
        let source = '# Long streaming benchmark\n\n'
        let index = 0
        while (source.length < targetBytes) source += section(index++)
        return source
    }

    const percentile = (sorted: number[], fraction: number): number => {
        if (sorted.length === 0) return 0
        return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))]
    }

    const round = (value: number): number => Math.round(value * 1000) / 1000

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

    const clear = async (): Promise<void> => {
        activeRenderer = null
        content = ''
        lastResult = null
        await tick()
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    }

    const run = async (renderer: Renderer, scenarioId: string): Promise<RunResult> => {
        const scenario = scenarios.find((candidate) => candidate.id === scenarioId)
        if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`)

        await clear()
        status = `running ${renderer} / ${scenario.id}`
        activeRenderer = renderer
        await tick()

        const source = makeCorpus(scenario.targetBytes)
        const durations: number[] = []
        let mutations = 0
        const observer = new MutationObserver((records) => {
            mutations += records.length
        })
        if (outputElement) observer.observe(outputElement, { childList: true, subtree: true })

        const heapBefore = readHeap()
        const startedAt = performance.now()
        for (
            let offset = scenario.chunkSize;
            offset < source.length;
            offset += scenario.chunkSize
        ) {
            const updateStartedAt = performance.now()
            content = source.slice(0, offset)
            await tick()
            if (scenario.mode === 'frame-paced') {
                await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
            }
            durations.push(performance.now() - updateStartedAt)
        }
        const updateStartedAt = performance.now()
        content = source
        await tick()
        durations.push(performance.now() - updateStartedAt)
        const settleStartedAt = performance.now()
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        await tick()
        const settleMs = performance.now() - settleStartedAt
        const totalMs = performance.now() - startedAt
        const heapAfter = readHeap()
        observer.disconnect()

        const sorted = [...durations].sort((a, b) => a - b)
        const outputText = (outputElement?.textContent ?? '').replace(/\s+/g, ' ').trim()
        const result: RunResult = {
            renderer,
            scenario: scenario.id,
            sourceBytes: source.length,
            chunkSize: scenario.chunkSize,
            chunks: durations.length,
            totalMs: round(totalMs),
            avgMs: round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
            p50Ms: round(percentile(sorted, 0.5)),
            p95Ms: round(percentile(sorted, 0.95)),
            p99Ms: round(percentile(sorted, 0.99)),
            peakMs: round(sorted.at(-1) ?? 0),
            settleMs: round(settleMs),
            chunksPerSec: round((durations.length / totalMs) * 1000),
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
