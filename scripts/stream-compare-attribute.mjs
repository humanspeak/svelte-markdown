/**
 * Browser cost attribution for one Svelte Markdown streaming run.
 *
 * Opens the stream-compare bench page in headless Chromium, records a CDP
 * trace (`Tracing.start`) and a CPU profile (`Profiler.start`) around ONE
 * measured `svelte-markdown` iteration of a scenario, then splits the main
 * thread's time inside the page's measured windows into buckets:
 *
 *   flush        JS inside the library's `svelte-markdown:stream-flush`
 *                User Timing measure (parse + diff + state write)
 *   jsOutside    other JS (FunctionCall / RunMicrotasks / v8.*): Svelte
 *                deriveds, the DOM commit, metadata preparation, harness
 *   styleLayout  UpdateLayoutTree + Layout (incl. the page's forced read)
 *   paint        Paint / PrePaint / Layerize / CompositeLayers / Commit
 *   gc           MinorGC / MajorGC
 *   other        every other traced main-thread task time
 *   untraced     window time with no main-thread trace event (idle or
 *                unattributed; e.g. the gap between the vsync timestamp and
 *                the start of the frame's task)
 *
 * The measured windows are the page's own `stream-bench:sync` and
 * `stream-bench:frame-work` User Timing measures (`traceWindows: true`), so
 * the bucket sum is directly comparable with the run's `totalWorkMs`. Paint
 * and composite work that happens AFTER a frame window closes (the frame's
 * normal paint, not charged by the bench) is reported separately as
 * `paintOutsideWindows`.
 *
 * Start a production preview first (`pnpm build && pnpm preview`), then:
 *   STREAM_COMPARE_SCENARIO=prose-mixed node scripts/stream-compare-attribute.mjs
 *
 * Env:
 *   STREAM_COMPARE_URL        page URL (default http://localhost:4173/test/stream-compare)
 *   STREAM_COMPARE_SCENARIO   scenario id (default prose-mixed)
 *   STREAM_ATTRIBUTE_WARMUPS  untraced warmup runs before the traced one (default 1)
 *   STREAM_ATTRIBUTE_OUT_DIR  also write `<scenario>.attribution.json` here
 *
 * Writes `/tmp/<scenario>.trace.json` and `/tmp/<scenario>.cpuprofile`.
 * The traced run disables the page's parity check so the CPU profile is not
 * dominated by the reference parse (parity runs outside the measured windows
 * and does not affect the buckets either way).
 */

import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const URL = process.env.STREAM_COMPARE_URL ?? 'http://localhost:4173/test/stream-compare'
const SCENARIO = process.env.STREAM_COMPARE_SCENARIO ?? 'prose-mixed'
const WARMUPS = Number(process.env.STREAM_ATTRIBUTE_WARMUPS ?? 1)
const OUT_DIR = process.env.STREAM_ATTRIBUTE_OUT_DIR
const RENDERER = 'svelte-markdown'
const TRACE_CATEGORIES = [
    'devtools.timeline',
    'disabled-by-default-devtools.timeline',
    'v8.execute',
    'blink.user_timing'
]
const FLUSH_MEASURE = 'svelte-markdown:stream-flush'
const WINDOW_MEASURES = new Set(['stream-bench:sync', 'stream-bench:frame-work'])
const PROFILER_SAMPLING_US = 250
const TOP_FUNCTIONS = 15
const BUCKETS = ['flush', 'jsOutside', 'styleLayout', 'paint', 'gc', 'other', 'untraced']
const BUCKET_LABELS = {
    flush: 'stream-flush measure (parse+diff+state write)',
    jsOutside: 'JS outside flush (derived + DOM commit + metadata)',
    styleLayout: 'UpdateLayoutTree + Layout',
    paint: 'Paint + composite',
    gc: 'MinorGC / MajorGC',
    other: 'other traced main-thread work',
    untraced: 'untraced window time (idle / gaps)'
}

// ---- Event classification ---------------------------------------------------

const STYLE_LAYOUT = new Set([
    'UpdateLayoutTree',
    'RecalculateStyles',
    'Layout',
    'InvalidateLayout',
    'LayoutShift'
])
const PAINT = new Set([
    'Paint',
    'PaintImage',
    'PrePaint',
    'PaintSetup',
    'Layerize',
    'UpdateLayerTree',
    'UpdateLayer',
    'CompositeLayers',
    'Commit',
    'Decode Image'
])
const GC = new Set(['MinorGC', 'MajorGC', 'GCEvent', 'BlinkGC.AtomicPhase'])
const JS = new Set([
    'FunctionCall',
    'RunMicrotasks',
    'EvaluateScript',
    'FireAnimationFrame',
    'TimerFire',
    'EventDispatch',
    'ProfileCall',
    'V8.Execute',
    'v8.run',
    'v8.compile',
    'v8.callFunction',
    'v8.evaluateModule',
    'V8.ParseFunctions',
    'CompileCode',
    'CompileScript'
])

/** Own bucket of a trace event, or `null` to inherit the enclosing event's bucket. */
const classify = (event) => {
    if (STYLE_LAYOUT.has(event.name)) return 'styleLayout'
    if (PAINT.has(event.name)) return 'paint'
    if (GC.has(event.name) || event.name.startsWith('V8.GC')) return 'gc'
    if (JS.has(event.name) || event.cat.split(',').some((cat) => cat.startsWith('v8'))) return 'js'
    return null
}

// ---- Interval helpers -------------------------------------------------------

/** Sorts and merges `[start, end]` intervals. */
const mergeIntervals = (intervals) => {
    const sorted = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0])
    const merged = []
    for (const [start, end] of sorted) {
        const last = merged.at(-1)
        if (last && start <= last[1]) last[1] = Math.max(last[1], end)
        else merged.push([start, end])
    }
    return merged
}

/** Total length of `[start, end]` that overlaps a merged, sorted interval list. */
const overlap = (start, end, merged) => {
    let total = 0
    for (const [a, b] of merged) {
        if (b <= start) continue
        if (a >= end) break
        total += Math.min(end, b) - Math.max(start, a)
    }
    return total
}

/** Intersection of `[start, end]` with a merged, sorted interval list. */
const intersect = (start, end, merged) => {
    const out = []
    for (const [a, b] of merged) {
        if (b <= start) continue
        if (a >= end) break
        out.push([Math.max(start, a), Math.min(end, b)])
    }
    return out
}

// ---- Trace analysis ---------------------------------------------------------

/** Pairs async begin/end User Timing events into `{ name, start, end }` (µs). */
const collectMeasures = (events, names) => {
    const open = new Map()
    const measures = []
    for (const event of events) {
        if (!names.has(event.name) || !event.cat.includes('blink.user_timing')) continue
        const key = `${event.name}|${event.id2?.local ?? event.id2?.global ?? event.id ?? ''}`
        if (event.ph === 'b' || event.ph === 'S') {
            open.set(key, event)
        } else if (event.ph === 'e' || event.ph === 'F') {
            const begin = open.get(key)
            if (!begin) continue
            open.delete(key)
            measures.push({
                name: event.name,
                pid: begin.pid,
                tid: begin.tid,
                start: begin.ts,
                end: event.ts
            })
        } else if (event.ph === 'X') {
            measures.push({
                name: event.name,
                pid: event.pid,
                tid: event.tid,
                start: event.ts,
                end: event.ts + (event.dur ?? 0)
            })
        }
    }
    return measures.sort((a, b) => a.start - b.start)
}

/**
 * Builds the nesting tree of complete ('X') and B/E events on one thread and
 * returns every event with its effective bucket and self-time intervals.
 */
const buildThreadSlices = (events, pid, tid) => {
    const spans = []
    const stack = []
    for (const event of events) {
        if (event.pid !== pid || event.tid !== tid) continue
        if (event.ph === 'X' && typeof event.dur === 'number') {
            spans.push({
                name: event.name,
                cat: event.cat,
                start: event.ts,
                end: event.ts + event.dur
            })
        } else if (event.ph === 'B') {
            stack.push(event)
        } else if (event.ph === 'E') {
            const begin = stack.pop()
            if (begin)
                spans.push({ name: begin.name, cat: begin.cat, start: begin.ts, end: event.ts })
        }
    }
    // Parents first: earlier start, then longer duration.
    spans.sort((a, b) => a.start - b.start || b.end - a.end)

    const slices = []
    const open = []
    const close = (node) => {
        // Self intervals = own span minus direct children.
        let cursor = node.start
        for (const child of node.children) {
            if (child.start > cursor) {
                slices.push({
                    bucket: node.bucket,
                    name: node.name,
                    start: cursor,
                    end: child.start
                })
            }
            cursor = Math.max(cursor, child.end)
        }
        if (node.end > cursor) {
            slices.push({ bucket: node.bucket, name: node.name, start: cursor, end: node.end })
        }
    }
    for (const span of spans) {
        while (open.length && open.at(-1).end <= span.start) close(open.pop())
        const parent = open.at(-1)
        // Clip malformed overlaps to the parent.
        const node = {
            ...span,
            end: parent ? Math.min(span.end, parent.end) : span.end,
            children: [],
            bucket: classify(span) ?? parent?.bucket ?? 'other'
        }
        if (node.end <= node.start) continue
        parent?.children.push(node)
        open.push(node)
    }
    while (open.length) close(open.pop())
    return slices
}

/**
 * Attributes main-thread self time inside the measured windows to buckets.
 *
 * @returns bucket totals in ms plus window/paint diagnostics
 */
const attribute = (traceEvents) => {
    const measures = collectMeasures(traceEvents, new Set([...WINDOW_MEASURES, FLUSH_MEASURE]))
    const windows = measures.filter((measure) => WINDOW_MEASURES.has(measure.name))
    if (windows.length === 0)
        throw new Error('No stream-bench:* window measures found in the trace')
    const { pid, tid } = windows[0]
    const windowIntervals = mergeIntervals(windows.map(({ start, end }) => [start, end]))
    const syncIntervals = mergeIntervals(
        windows
            .filter((measure) => measure.name === 'stream-bench:sync')
            .map(({ start, end }) => [start, end])
    )
    const flushIntervals = mergeIntervals(
        measures
            .filter((measure) => measure.name === FLUSH_MEASURE)
            .map(({ start, end }) => [start, end])
    )

    const totalsUs = Object.fromEntries(BUCKETS.map((bucket) => [bucket, 0]))
    let paintOutsideUs = 0
    let jsOutsideSyncUs = 0
    const otherByName = new Map()
    const runStart = windowIntervals[0][0]
    const runEnd = windowIntervals.at(-1)[1]
    const slices = buildThreadSlices(traceEvents, pid, tid)
    for (const slice of slices) {
        const inside = intersect(slice.start, slice.end, windowIntervals)
        const insideUs = inside.reduce((total, [a, b]) => total + (b - a), 0)
        if (slice.bucket === 'paint' && slice.start >= runStart && slice.end <= runEnd + 50_000) {
            paintOutsideUs += slice.end - slice.start - insideUs
        }
        if (insideUs === 0) continue
        if (slice.bucket === 'js') {
            const inFlush = inside.reduce(
                (total, [a, b]) => total + overlap(a, b, flushIntervals),
                0
            )
            const inSync = inside.reduce((total, [a, b]) => total + overlap(a, b, syncIntervals), 0)
            totalsUs.flush += inFlush
            totalsUs.jsOutside += insideUs - inFlush
            // Flushes run in the frame window, so sync-window JS is all outside the flush.
            jsOutsideSyncUs += inSync
        } else {
            totalsUs[slice.bucket] += insideUs
            if (slice.bucket === 'other') {
                otherByName.set(slice.name, (otherByName.get(slice.name) ?? 0) + insideUs)
            }
        }
    }
    const windowUs = windowIntervals.reduce((total, [a, b]) => total + (b - a), 0)
    // The page sums raw window durations. When a frame overruns, the next
    // frame's rAF timestamp can precede the end of the previous window, so
    // the raw sum counts the overlap twice; the buckets use the union.
    const windowRawUs = windows.reduce((total, { start, end }) => total + (end - start), 0)
    const tracedUs = BUCKETS.filter((bucket) => bucket !== 'untraced').reduce(
        (total, bucket) => total + totalsUs[bucket],
        0
    )
    totalsUs.untraced = Math.max(0, windowUs - tracedUs)
    const flushMeasureUs = flushIntervals.reduce((total, [a, b]) => total + (b - a), 0)

    const toMs = (us) => Math.round(us) / 1000
    return {
        mainThread: { pid, tid },
        windowCount: windows.length,
        windowMs: toMs(windowUs),
        windowRawMs: toMs(windowRawUs),
        windowIntervals,
        flushMeasureMs: toMs(flushMeasureUs),
        flushMeasureCount: flushIntervals.length,
        bucketsMs: Object.fromEntries(BUCKETS.map((bucket) => [bucket, toMs(totalsUs[bucket])])),
        paintOutsideWindowsMs: toMs(paintOutsideUs),
        jsOutsideSyncMs: toMs(jsOutsideSyncUs),
        otherTopMs: [...otherByName.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, us]) => ({ name, ms: toMs(us) }))
    }
}

// ---- CPU profile analysis ---------------------------------------------------

/**
 * Top functions by self time from a CDP CPU profile, optionally restricted
 * to samples that fall inside `windows` (µs, same clock as the trace).
 */
const topSelfTime = (profile, windows) => {
    const nodes = new Map(profile.nodes.map((node) => [node.id, node]))
    const byFunction = new Map()
    let time = profile.startTime
    let insideSamples = 0
    const addSample = (nodeId, intervalUs, sampleEnd) => {
        const deltaUs = windows ? overlap(sampleEnd - intervalUs, sampleEnd, windows) : intervalUs
        if (deltaUs === 0) return
        insideSamples++
        const { callFrame } = nodes.get(nodeId)
        const key = `${callFrame.functionName}|${callFrame.url}|${callFrame.lineNumber}|${callFrame.columnNumber}`
        const entry = byFunction.get(key) ?? {
            functionName: callFrame.functionName || '(anonymous)',
            url: callFrame.url,
            line: callFrame.lineNumber + 1,
            column: callFrame.columnNumber + 1,
            selfUs: 0
        }
        entry.selfUs += deltaUs
        byFunction.set(key, entry)
    }
    profile.samples.forEach((nodeId, index) => {
        const delta = profile.timeDeltas[index] ?? 0
        time += delta
        // Each sample stands for the interval up to the next sample.
        const next = profile.timeDeltas[index + 1] ?? delta
        addSample(nodeId, next, time + next)
    })
    const totalUs = [...byFunction.values()].reduce((total, entry) => total + entry.selfUs, 0)
    const functions = [...byFunction.values()]
        .filter((entry) => !['(idle)', '(program)', '(root)'].includes(entry.functionName))
        .sort((a, b) => b.selfUs - a.selfUs)
        .slice(0, TOP_FUNCTIONS)
        .map((entry) => ({
            ...entry,
            selfMs: Math.round(entry.selfUs) / 1000,
            share: totalUs ? Math.round((entry.selfUs / totalUs) * 1000) / 10 : 0
        }))
    return { insideSamples, totalMs: Math.round(totalUs) / 1000, functions }
}

// ---- Main --------------------------------------------------------------------

const readStream = async (client, handle) => {
    const chunks = []
    for (;;) {
        const { data, eof, base64Encoded } = await client.send('IO.read', { handle, size: 1 << 20 })
        chunks.push(base64Encoded ? Buffer.from(data, 'base64').toString('utf8') : data)
        if (eof) break
    }
    await client.send('IO.close', { handle })
    return chunks.join('')
}

const pad = (value, width) => String(value).padStart(width)

const browser = await chromium.launch({ headless: true })
try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForFunction(() => Boolean(globalThis.__streamBenchmark))
    const known = await page.evaluate(() => globalThis.__streamBenchmark.scenarios.map((s) => s.id))
    if (!known.includes(SCENARIO)) throw new Error(`Unknown scenario: ${SCENARIO}`)

    const runOnce = (options) =>
        page.evaluate(
            ({ renderer, scenario, runOptions }) =>
                globalThis.__streamBenchmark.run(renderer, scenario, runOptions),
            { renderer: RENDERER, scenario: SCENARIO, runOptions: options }
        )
    for (let index = 0; index < WARMUPS; index++) await runOnce({ parity: false })

    const client = await page.context().newCDPSession(page)
    await client.send('Profiler.enable')
    await client.send('Profiler.setSamplingInterval', { interval: PROFILER_SAMPLING_US })
    const tracingComplete = new Promise((resolve) =>
        client.once('Tracing.tracingComplete', resolve)
    )
    await client.send('Tracing.start', {
        categories: TRACE_CATEGORIES.join(','),
        transferMode: 'ReturnAsStream'
    })
    await client.send('Profiler.start')

    const result = await runOnce({ parity: false, traceWindows: true })

    const { profile } = await client.send('Profiler.stop')
    await client.send('Tracing.end')
    const { stream } = await tracingComplete
    const traceText = await readStream(client, stream)
    const trace = JSON.parse(traceText)
    const traceEvents = Array.isArray(trace) ? trace : trace.traceEvents

    const tracePath = `/tmp/${SCENARIO}.trace.json`
    const profilePath = `/tmp/${SCENARIO}.cpuprofile`
    await writeFile(tracePath, traceText)
    await writeFile(profilePath, JSON.stringify(profile))

    const attribution = attribute(traceEvents)
    let profileTop = topSelfTime(profile, attribution.windowIntervals)
    let profileScope = 'samples inside the measured windows'
    if (profileTop.insideSamples === 0) {
        profileTop = topSelfTime(profile, null)
        profileScope = 'ALL samples (profile clock did not align with trace windows)'
    }

    const frames = result.frames
    const bucketSum = BUCKETS.reduce((total, bucket) => total + attribution.bucketsMs[bucket], 0)
    const tracedSum = bucketSum - attribution.bucketsMs.untraced
    const coverage = tracedSum / result.totalWorkMs
    const windowVsTotal = attribution.windowMs / result.totalWorkMs

    console.log(
        `=== attribution: ${SCENARIO} (${RENDERER}, 1 traced run after ${WARMUPS} warmup) ===`
    )
    console.log(
        `page: totalWorkMs ${result.totalWorkMs} · frames ${frames} · avg ${result.avgWorkMs} · p95 ${result.p95WorkMs} · libraryFlushMs ${result.libraryFlushMs} (${result.libraryFlushCount} flushes)`
    )
    const doubleCounted = Math.round((attribution.windowRawMs - attribution.windowMs) * 1000) / 1000
    console.log(
        `trace: ${attribution.windowCount} window measures, raw sum ${attribution.windowRawMs}ms, union ${attribution.windowMs}ms (${(windowVsTotal * 100).toFixed(1)}% of totalWorkMs; ${doubleCounted}ms of overlapping windows counted twice by the page)`
    )
    console.log(
        `flush measure ${attribution.flushMeasureMs}ms over ${attribution.flushMeasureCount} flushes · main thread pid ${attribution.mainThread.pid} tid ${attribution.mainThread.tid}`
    )
    console.log('')
    console.log(
        `${'bucket'.padEnd(52)} ${pad('total ms', 10)} ${pad('ms/frame', 9)} ${pad('share', 7)}`
    )
    for (const bucket of BUCKETS) {
        const ms = attribution.bucketsMs[bucket]
        console.log(
            `${BUCKET_LABELS[bucket].padEnd(52)} ${pad(ms.toFixed(1), 10)} ${pad((ms / frames).toFixed(3), 9)} ${pad(`${((ms / bucketSum) * 100).toFixed(1)}%`, 7)}`
        )
    }
    console.log(
        `${'sum of buckets'.padEnd(52)} ${pad(bucketSum.toFixed(1), 10)} ${pad((bucketSum / frames).toFixed(3), 9)}`
    )
    const jsSync = attribution.jsOutsideSyncMs
    console.log(
        `  of which JS outside flush: ${jsSync}ms in the sync window (prop assignment + tick) · ${Math.round((attribution.bucketsMs.jsOutside - jsSync) * 1000) / 1000}ms in the frame window`
    )
    console.log(
        `  "other" by event: ${attribution.otherTopMs.map(({ name, ms }) => `${name} ${ms}ms`).join(' · ') || 'none'}`
    )
    console.log(
        `traced buckets (excl. untraced) = ${tracedSum.toFixed(1)}ms = ${(coverage * 100).toFixed(1)}% of page totalWorkMs ${result.totalWorkMs}ms · ${((tracedSum / attribution.windowMs) * 100).toFixed(1)}% of the window union`
    )
    console.log(
        `paint + composite after the windows (not charged by the bench): ${attribution.paintOutsideWindowsMs}ms (${(attribution.paintOutsideWindowsMs / frames).toFixed(3)} ms/frame)`
    )
    console.log('')
    console.log(
        `top ${TOP_FUNCTIONS} functions by self time (${profileScope}; ${profileTop.totalMs}ms sampled)`
    )
    profileTop.functions.forEach((entry, index) => {
        console.log(
            `${pad(index + 1, 2)}. ${pad(entry.selfMs.toFixed(1), 8)}ms ${pad(`${entry.share}%`, 6)}  ${entry.functionName}  ${entry.url ? `${entry.url}:${entry.line}:${entry.column}` : '(native)'}`
        )
    })
    if (pageErrors.length) console.log(`page errors: ${pageErrors.join(' | ')}`)
    console.log(`\ntrace: ${tracePath}\ncpu profile: ${profilePath}`)

    const summary = {
        scenario: SCENARIO,
        renderer: RENDERER,
        capturedAt: new Date().toISOString(),
        url: URL,
        warmups: WARMUPS,
        userAgent: await page.evaluate(() => navigator.userAgent),
        page: {
            totalWorkMs: result.totalWorkMs,
            frames,
            avgWorkMs: result.avgWorkMs,
            p95WorkMs: result.p95WorkMs,
            libraryFlushMs: result.libraryFlushMs,
            libraryFlushCount: result.libraryFlushCount
        },
        trace: {
            windowCount: attribution.windowCount,
            windowMs: attribution.windowMs,
            windowRawMs: attribution.windowRawMs,
            flushMeasureMs: attribution.flushMeasureMs,
            flushMeasureCount: attribution.flushMeasureCount,
            paintOutsideWindowsMs: attribution.paintOutsideWindowsMs,
            jsOutsideSyncMs: attribution.jsOutsideSyncMs,
            otherTopMs: attribution.otherTopMs
        },
        bucketsMs: attribution.bucketsMs,
        bucketsMsPerFrame: Object.fromEntries(
            BUCKETS.map((bucket) => [
                bucket,
                Math.round((attribution.bucketsMs[bucket] / frames) * 1000) / 1000
            ])
        ),
        tracedCoverageOfTotalWork: Math.round(coverage * 1000) / 1000,
        tracedCoverageOfWindowUnion: Math.round((tracedSum / attribution.windowMs) * 1000) / 1000,
        profile: { scope: profileScope, sampledMs: profileTop.totalMs, top: profileTop.functions },
        pageErrors
    }
    if (OUT_DIR) {
        await mkdir(OUT_DIR, { recursive: true })
        const outPath = path.join(OUT_DIR, `${SCENARIO}.attribution.json`)
        await writeFile(outPath, `${JSON.stringify(summary, null, 2)}\n`)
        console.log(`summary: ${outPath}`)
    }
} finally {
    await browser.close()
}
