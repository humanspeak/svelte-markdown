<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { Token, TokensList } from '$lib/utils/markdown-parser.js'
    import { buildParserOptions } from '$lib/utils/extension-options.js'
    import { parseAndCacheTokens } from '$lib/utils/parse-and-cache.js'
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
     * Windows never overlap: when a frame overruns its budget, the next rAF
     * timestamp can predate the end of the previous measured window, so the
     * frame window starts at max(rAF timestamp, previous window end). The
     * clipped time is reported as `overlapClampedMs` (it was previously
     * charged twice).
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
     * `[n]: url` definitions block. Prefix-scaling scenarios mount a closed
     * prefix of growing size (24 / 96 / 384 KB) and then stream the same short
     * tail, so work that scales with document length shows up as growth in
     * `avgWorkMs` across the three. `large-closed-block` does the same with a
     * 20 KB closed nested list as the prefix.
     *
     * Correctness checks (outside the measured windows):
     *
     *   parityMismatches   Svelte Markdown only. Every PARITY_EVERY frames and
     *                      on the final frame, the streamed token tree (from
     *                      the `parsed` callback) is compared against a fresh
     *                      parse of the same cumulative source through the
     *                      library's own parse path, key by key.
     *   domProjection      Both renderers. A normalized projection of the final
     *                      DOM (headings, links, images, table shapes, code
     *                      texts) that the runner compares across renderers.
     *
     * Input modes: `prop` re-assigns the cumulative `source`/`content` prop;
     * `writeChunk` (Svelte Markdown only) holds a component ref and appends the
     * delta through the imperative `writeChunk()` API.
     */

    type Renderer = 'svelte-markdown' | 'svelte-streamdown'
    type CorpusKind = 'prose-mixed' | 'long-list' | 'long-table' | 'long-code-fence' | 'citations'
    type PrefixKind = 'closed-paragraphs' | 'closed-nested-list'
    type InputMode = 'prop' | 'writeChunk'

    interface Scenario {
        id: string
        /** Streamed corpus (the tail, when `prefix` is set). */
        corpus: CorpusKind
        targetBytes: number
        /** Characters appended per update. */
        chunkSize: number
        /** Cumulative prop assignments (or `writeChunk` calls) per animation frame. */
        updatesPerFrame: number
        /** How updates reach the renderer. `writeChunk` is Svelte Markdown only. */
        inputMode: InputMode
        /** Renderers that support this scenario; the runner skips the others. */
        renderers: Renderer[]
        /** Closed content mounted (unmeasured) before streaming starts. */
        prefix?: { kind: PrefixKind; bytes: number }
    }

    interface RunOptions {
        /** Run the semantic parity check (Svelte Markdown only). Default true. */
        parity?: boolean
        /**
         * Emit `stream-bench:sync` / `stream-bench:frame-work` User Timing
         * measures for every measured window, so a trace can be clipped to
         * exactly the work this page reports. Default false.
         */
        traceWindows?: boolean
    }

    interface DomProjection {
        headings: { tag: string; text: string }[]
        links: { href: string; text: string }[]
        images: { src: string; alt: string }[]
        tables: { rows: number; cols: number }[]
        codeBlocks: string[]
    }

    interface RunResult {
        renderer: Renderer
        scenario: string
        corpus: CorpusKind
        inputMode: InputMode
        prefixBytes: number
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
        /**
         * Time clipped from frame windows whose rAF timestamp predated the end
         * of the previous measured window (would otherwise be counted twice).
         */
        overlapClampedMs: number
        libraryFlushMs: number | null
        libraryFlushCount: number | null
        domNodes: number
        mutations: number
        heapDeltaKb: number | null
        outputHash: string
        outputLength: number
        /** Parity checks performed (null for the competitor or when disabled). */
        parityChecks: number | null
        /** Checks whose streamed tokens differed from a fresh parse. */
        parityMismatches: number | null
        /** Path of the first differing field, e.g. `[3].tokens[1].href`. */
        firstParityMismatch: string | null
        /** Up to five mismatches (path, values, cumulative source length). */
        parityMismatchSamples: string[] | null
        /** Normalized final-DOM projection for cross-renderer comparison. */
        domProjection: DomProjection
    }

    interface BenchWindow extends Window {
        __streamBenchmark?: {
            scenarios: Scenario[]
            run: (
                _renderer: Renderer,
                _scenarioId: string,
                _options?: RunOptions
            ) => Promise<RunResult>
            clear: () => Promise<void>
        }
        [STREAM_FLUSH_PROFILE_FLAG]?: boolean
    }

    interface PerformanceWithMemory extends Performance {
        memory?: { usedJSHeapSize: number }
    }

    const FRAME_BUDGET_MS = 1000 / 60
    const PARITY_EVERY = 25
    const TRACE_SYNC_MEASURE = 'stream-bench:sync'
    const TRACE_FRAME_MEASURE = 'stream-bench:frame-work'
    const BOTH: Renderer[] = ['svelte-markdown', 'svelte-streamdown']
    const OURS_ONLY: Renderer[] = ['svelte-markdown']
    const TAIL_BYTES = 2_000

    // 32 chars/frame ≈ 480 tokens/s at 60 fps — a fast model, and a fixed
    // per-frame input so both renderers see identical work.
    const scenarios: Scenario[] = [
        {
            id: 'prose-mixed',
            corpus: 'prose-mixed',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'prop',
            renderers: BOTH
        },
        {
            id: 'prose-mixed-4x',
            corpus: 'prose-mixed',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 4,
            inputMode: 'prop',
            renderers: BOTH
        },
        {
            id: 'long-list',
            corpus: 'long-list',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'prop',
            renderers: BOTH
        },
        {
            id: 'long-table',
            corpus: 'long-table',
            targetBytes: 10_000,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'prop',
            renderers: BOTH
        },
        {
            id: 'long-code-fence',
            corpus: 'long-code-fence',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'prop',
            renderers: BOTH
        },
        {
            id: 'citations',
            corpus: 'citations',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'prop',
            renderers: BOTH
        },
        {
            id: 'prose-mixed-writechunk',
            corpus: 'prose-mixed',
            targetBytes: 24_000,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'writeChunk',
            renderers: OURS_ONLY
        },
        // Prefix scaling: identical ~2 KB tail, growing closed prefix.
        ...[24_000, 96_000, 384_000].map((bytes): Scenario => ({
            id: `prefix-${bytes / 1000}kb`,
            corpus: 'prose-mixed',
            targetBytes: TAIL_BYTES,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'prop',
            renderers: BOTH,
            prefix: { kind: 'closed-paragraphs', bytes }
        })),
        {
            id: 'large-closed-block',
            corpus: 'prose-mixed',
            targetBytes: TAIL_BYTES,
            chunkSize: 32,
            updatesPerFrame: 1,
            inputMode: 'prop',
            renderers: BOTH,
            prefix: { kind: 'closed-nested-list', bytes: 20_000 }
        }
    ]

    let activeRenderer = $state<Renderer | null>(null)
    let activeInputMode = $state<InputMode>('prop')
    let content = $state('')
    let markdownRef = $state<ReturnType<typeof SvelteMarkdown>>()
    // Length of the source already handed to `writeChunk` in the current run.
    let appliedLength = 0
    // Latest token tree handed to `parsed`; a plain variable, not state, so
    // recording it adds no reactive work to the measured frame.
    let latestParsedTokens: Token[] | TokensList | undefined
    const onParsed = (tokens: Token[] | TokensList) => {
        latestParsedTokens = tokens
    }
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

    /**
     * One GFM table (4 columns of short inline content: bold, code span, link)
     * that stays a single open block until the trailing blank line.
     */
    const makeLongTable = (targetBytes: number): string => {
        let source =
            'Every module and its owner:\n\n| # | Name | Module | Docs |\n| --- | --- | --- | --- |\n'
        let index = 1
        while (source.length < targetBytes) {
            source += `| ${index} | **Item ${index}** | \`mod${index}\` | [docs](https://example.com/t/${index}) |\n`
            index++
        }
        return `${source}\nThat is the full table.\n`
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

    /** Many short, closed paragraphs and headings (ends with a blank line). */
    const makeClosedParagraphs = (targetBytes: number): string => {
        let source = ''
        let index = 0
        while (source.length < targetBytes) {
            source += `### Note ${index}\n\nClosed paragraph ${index} with **bold**, *emphasis*, \`code\`, and a [link](https://example.com/prefix/${index}).\n\n`
            index++
        }
        return source
    }

    /** One closed nested bullet list followed by a blank line. */
    const makeClosedNestedList = (targetBytes: number): string => {
        let source = ''
        let index = 0
        while (source.length < targetBytes) {
            source += `- Item ${index} with **bold** text\n  - Nested ${index}.a with \`code\`\n  - Nested ${index}.b with a [link](https://example.com/list/${index})\n`
            index++
        }
        return `${source}\n`
    }

    const makePrefix = (kind: PrefixKind, targetBytes: number): string => {
        switch (kind) {
            case 'closed-paragraphs':
                return makeClosedParagraphs(targetBytes)
            case 'closed-nested-list':
                return makeClosedNestedList(targetBytes)
        }
    }

    const makeCorpus = (kind: CorpusKind, targetBytes: number): string => {
        switch (kind) {
            case 'prose-mixed':
                return makeProseMixed(targetBytes)
            case 'long-list':
                return makeLongList(targetBytes)
            case 'long-table':
                return makeLongTable(targetBytes)
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

    const parityOptions = buildParserOptions({}, [])

    /** Short printable form of a value for mismatch reports. */
    const describe = (value: unknown): string => {
        if (typeof value === 'function') return 'function'
        const text = JSON.stringify(value) ?? String(value)
        return text.length > 80 ? `${text.slice(0, 80)}…` : text
    }

    /**
     * Key-by-key structural equality for token trees: primitives by value,
     * arrays element-wise (null elements allowed, e.g. table `align`), nested
     * objects recursively over the union of their own enumerable keys; a key
     * missing on one side equals `undefined` on the other; functions are never
     * equal.
     *
     * @param a - Streamed value
     * @param b - Freshly parsed value
     * @param path - Path of `a`/`b` from the root, used in the result
     * @returns `null` when equal, otherwise the path of the first difference
     */
    const tokensSemanticallyEqual = (a: unknown, b: unknown, path = ''): string | null => {
        const differ = (at: string, left: unknown, right: unknown) =>
            `${at || '<root>'} (streamed ${describe(left)} · fresh ${describe(right)})`
        if (typeof a === 'function' || typeof b === 'function') return differ(path, a, b)
        if (a === b) return null
        if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
            return Number.isNaN(a) && Number.isNaN(b) ? null : differ(path, a, b)
        }
        if (Array.isArray(a) !== Array.isArray(b)) return differ(path, a, b)
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return differ(`${path}.length`, a.length, b.length)
            for (let index = 0; index < a.length; index++) {
                const mismatch = tokensSemanticallyEqual(a[index], b[index], `${path}[${index}]`)
                if (mismatch) return mismatch
            }
            return null
        }
        const left = a as Record<string, unknown>
        const right = b as Record<string, unknown>
        const keys = new Set([...Object.keys(left), ...Object.keys(right)])
        for (const key of keys) {
            const mismatch = tokensSemanticallyEqual(left[key], right[key], `${path}.${key}`)
            if (mismatch) return mismatch
        }
        return null
    }

    /** Compares the latest streamed tokens with a fresh parse of `source`. */
    const checkParity = (source: string): string | null => {
        const fresh = parseAndCacheTokens(source, parityOptions, false)
        return tokensSemanticallyEqual(latestParsedTokens, fresh)
    }

    const normalizeText = (value: string | null | undefined): string =>
        (value ?? '').replace(/\s+/g, ' ').trim()

    /** Normalized projection of the rendered output, comparable across renderers. */
    const projectDom = (root: HTMLElement | undefined): DomProjection => {
        const all = <T extends Element = Element>(selector: string): T[] =>
            root ? [...root.querySelectorAll<T>(selector)] : []
        return {
            headings: all('h1, h2, h3, h4, h5, h6').map((element) => ({
                tag: element.tagName.toLowerCase(),
                text: normalizeText(element.textContent)
            })),
            links: all<HTMLAnchorElement>('a[href]').map((element) => ({
                href: element.getAttribute('href') ?? '',
                text: normalizeText(element.textContent)
            })),
            images: all<HTMLImageElement>('img').map((element) => ({
                src: element.getAttribute('src') ?? '',
                alt: element.getAttribute('alt') ?? ''
            })),
            tables: all<HTMLTableElement>('table').map((table) => ({
                rows: table.rows.length,
                cols: table.rows[0]?.cells.length ?? 0
            })),
            codeBlocks: all('pre').map((element) => normalizeText(element.textContent))
        }
    }

    const readHeap = (): number | null =>
        (performance as PerformanceWithMemory).memory?.usedJSHeapSize ?? null

    const nextFrame = (): Promise<DOMHighResTimeStamp> =>
        new Promise((resolve) => requestAnimationFrame((timestamp) => resolve(timestamp)))

    const clear = async (): Promise<void> => {
        activeRenderer = null
        activeInputMode = 'prop'
        content = ''
        latestParsedTokens = undefined
        lastResult = null
        await tick()
        await nextFrame()
    }

    /** End of the last measured window in a run, plus the time clipped against it. */
    interface WindowClock {
        previousWindowEnd: number
        overlapClampedMs: number
    }

    /**
     * Applies one frame's worth of updates and returns the main-thread work it
     * caused. See the module comment for the definition of each component.
     */
    const measureFrame = async (
        slices: string[],
        inputMode: InputMode,
        traceWindows: boolean,
        windowClock: WindowClock
    ): Promise<{ syncMs: number; frameWorkMs: number }> => {
        let syncMs = 0
        for (const slice of slices) {
            const startedAt = performance.now()
            if (inputMode === 'writeChunk') {
                // Slices are cumulative; hand the renderer only the delta.
                const delta = slice.slice(appliedLength)
                appliedLength = slice.length
                if (delta) markdownRef?.writeChunk(delta)
            } else {
                content = slice
            }
            await tick()
            const endedAt = performance.now()
            syncMs += endedAt - startedAt
            windowClock.previousWindowEnd = endedAt
            if (traceWindows) {
                performance.measure(TRACE_SYNC_MEASURE, { start: startedAt, end: endedAt })
            }
        }

        const frameTimestamp = await nextFrame()
        // Force style + layout so DOM-heavy output is charged to the renderer
        // that produced it, rather than to whichever frame paints next.
        outputElement?.getBoundingClientRect()
        const frameEnd = performance.now()
        // After an overrun the next rAF timestamp can predate the end of the
        // previous window; start there instead so no time is charged twice.
        if (frameTimestamp < windowClock.previousWindowEnd) {
            windowClock.overlapClampedMs += windowClock.previousWindowEnd - frameTimestamp
        }
        const frameStart = Math.max(frameTimestamp, windowClock.previousWindowEnd)
        const frameWorkMs = Math.max(0, frameEnd - frameStart)
        windowClock.previousWindowEnd = frameEnd
        if (traceWindows && frameEnd > frameStart) {
            performance.measure(TRACE_FRAME_MEASURE, { start: frameStart, end: frameEnd })
        }

        return { syncMs, frameWorkMs }
    }

    const run = async (
        renderer: Renderer,
        scenarioId: string,
        options: RunOptions = {}
    ): Promise<RunResult> => {
        const scenario = scenarios.find((candidate) => candidate.id === scenarioId)
        if (!scenario) throw new Error(`Unknown scenario: ${scenarioId}`)
        if (!scenario.renderers.includes(renderer)) {
            throw new Error(`Scenario ${scenarioId} does not support ${renderer}`)
        }
        const parityEnabled = renderer === 'svelte-markdown' && options.parity !== false
        const traceWindows = options.traceWindows === true

        const prefix = scenario.prefix
            ? makePrefix(scenario.prefix.kind, scenario.prefix.bytes)
            : ''
        const source = prefix + makeCorpus(scenario.corpus, scenario.targetBytes)

        await clear()
        status = `running ${renderer} / ${scenario.id}`
        // Mount with the closed prefix already present (unmeasured). In
        // writeChunk mode the prop stays '' and the prefix is written once.
        activeInputMode = scenario.inputMode
        content = scenario.inputMode === 'prop' ? prefix : ''
        appliedLength = 0
        activeRenderer = renderer
        await tick()
        if (scenario.inputMode === 'writeChunk' && prefix) {
            markdownRef?.writeChunk(prefix)
            appliedLength = prefix.length
        }
        if (prefix) {
            await nextFrame()
            await nextFrame()
        }

        const benchWindow = window as BenchWindow
        benchWindow[STREAM_FLUSH_PROFILE_FLAG] = renderer === 'svelte-markdown'
        performance.clearMeasures(STREAM_FLUSH_MEASURE)
        performance.clearMeasures(TRACE_SYNC_MEASURE)
        performance.clearMeasures(TRACE_FRAME_MEASURE)

        const slices: string[] = []
        for (
            let offset = prefix.length + scenario.chunkSize;
            offset < source.length;
            offset += scenario.chunkSize
        ) {
            slices.push(source.slice(0, offset))
        }
        slices.push(source)

        let parityChecks = 0
        let parityMismatches = 0
        let firstParityMismatch: string | null = null
        const parityMismatchSamples: string[] = []
        const runParity = (cumulative: string, final = false) => {
            parityChecks++
            const mismatch = checkParity(cumulative)
            if (mismatch) {
                parityMismatches++
                const sample = `${mismatch} (at ${cumulative.length}${final ? ' bytes, final' : ' bytes'})`
                firstParityMismatch ??= sample
                if (parityMismatchSamples.length < 5) parityMismatchSamples.push(sample)
            }
        }

        const workMs: number[] = []
        const syncMsSamples: number[] = []
        const frameWorkMsSamples: number[] = []
        let mutations = 0
        const observer = new MutationObserver((records) => {
            mutations += records.length
        })
        if (outputElement) observer.observe(outputElement, { childList: true, subtree: true })

        const windowClock: WindowClock = { previousWindowEnd: 0, overlapClampedMs: 0 }
        const heapBefore = readHeap()
        for (let index = 0; index < slices.length; index += scenario.updatesPerFrame) {
            const frameSlices = slices.slice(index, index + scenario.updatesPerFrame)
            const { syncMs, frameWorkMs } = await measureFrame(
                frameSlices,
                scenario.inputMode,
                traceWindows,
                windowClock
            )
            syncMsSamples.push(syncMs)
            frameWorkMsSamples.push(frameWorkMs)
            workMs.push(syncMs + frameWorkMs)

            if (parityEnabled && workMs.length % PARITY_EVERY === 0) {
                // Outside the measured window. The extra idle frame keeps the
                // next frame's rAF timestamp from predating this check.
                runParity(frameSlices.at(-1) ?? '')
                await nextFrame()
            }
        }
        // One idle frame so any deferred commit from the last update is charged.
        const trailing = await measureFrame([source], scenario.inputMode, traceWindows, windowClock)
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
        const outputText = normalizeText(outputElement?.textContent)
        // Final-frame parity check, after all measurement is done.
        if (parityEnabled) runParity(source, true)
        const domProjection = projectDom(outputElement)

        const result: RunResult = {
            renderer,
            scenario: scenario.id,
            corpus: scenario.corpus,
            inputMode: scenario.inputMode,
            prefixBytes: prefix.length,
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
            overlapClampedMs: round(windowClock.overlapClampedMs),
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
            outputLength: outputText.length,
            parityChecks: parityEnabled ? parityChecks : null,
            parityMismatches: parityEnabled ? parityMismatches : null,
            firstParityMismatch: parityEnabled ? firstParityMismatch : null,
            parityMismatchSamples: parityEnabled ? parityMismatchSamples : null,
            domProjection
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
            {#if scenario.renderers.includes('svelte-streamdown')}
                <button onclick={() => run('svelte-streamdown', scenario.id)}>
                    Svelte Streamdown · {scenario.id}
                </button>
            {/if}
        {/each}
        <button onclick={clear}>Clear</button>
    </div>

    {#if lastResult}
        <pre data-testid="benchmark-result">{JSON.stringify(
                { ...lastResult, domProjection: undefined },
                null,
                2
            )}</pre>
    {/if}

    <section class="output" data-testid="benchmark-output" bind:this={outputElement}>
        {#if activeRenderer === 'svelte-markdown'}
            <SvelteMarkdown
                bind:this={markdownRef}
                source={activeInputMode === 'prop' ? content : ''}
                streaming
                parsed={onParsed}
            />
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
