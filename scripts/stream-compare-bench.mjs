/**
 * Production-browser benchmark comparing append-only reactive updates in
 * @humanspeak/svelte-markdown and svelte-streamdown.
 *
 * Measures per-frame main-thread WORK (sync update + deferred frame work +
 * forced layout), not wall-clock latency — see the method comment in
 * `src/routes/test/stream-compare/+page.svelte`.
 *
 * Start a production preview first:
 *   pnpm build && pnpm preview
 * Then run:
 *   pnpm perf:stream-compare
 *
 * Env:
 *   STREAM_COMPARE_URL         page URL (default http://localhost:4173/test/stream-compare)
 *   STREAM_COMPARE_ITERATIONS  measured runs per renderer/scenario (default 5)
 *   STREAM_COMPARE_WARMUPS     discarded warmup runs per renderer (default 1)
 *   STREAM_COMPARE_SCENARIO    run a single scenario id
 *   STREAM_COMPARE_MODE        `paired` (default): per iteration run both renderers
 *                              back to back, alternating which goes first, so machine
 *                              drift hits both sides equally. `sequential`: all runs
 *                              of renderer A, then all of renderer B (the old order).
 *
 * Correctness: each Svelte Markdown run reports `parityMismatches` (streamed tokens
 * vs a fresh parse, sampled during the stream and at the end); the runner compares
 * the final-DOM projection (headings, links, images, table shapes, code texts)
 * across renderers and reports `domProjectionMatches` plus up to five differences.
 */

import { chromium } from '@playwright/test'

const URL = process.env.STREAM_COMPARE_URL ?? 'http://localhost:4173/test/stream-compare'
const ITERATIONS = Number(process.env.STREAM_COMPARE_ITERATIONS ?? 5)
const WARMUPS = Number(process.env.STREAM_COMPARE_WARMUPS ?? 1)
const SCENARIO = process.env.STREAM_COMPARE_SCENARIO
const MODE = process.env.STREAM_COMPARE_MODE ?? 'paired'
if (MODE !== 'paired' && MODE !== 'sequential') {
    throw new Error(`STREAM_COMPARE_MODE must be paired or sequential, got ${MODE}`)
}
const OURS = 'svelte-markdown'
const THEIRS = 'svelte-streamdown'
const MAX_PROJECTION_DIFFERENCES = 5

const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b)
    const middle = Math.floor(sorted.length / 2)
    return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

const round = (value) => Math.round(value * 1000) / 1000

const medianOf = (runs, key) => {
    const values = runs.map((run) => run[key]).filter((value) => value !== null)
    return values.length ? round(median(values)) : null
}

const maxOf = (runs, key) => {
    const values = runs.map((run) => run[key]).filter((value) => value !== null)
    return values.length ? Math.max(...values) : null
}

const summarize = (runs) => ({
    iterations: runs.length,
    frames: runs.at(-1)?.frames ?? 0,
    totalWorkMsMedian: medianOf(runs, 'totalWorkMs'),
    avgWorkMsMedian: medianOf(runs, 'avgWorkMs'),
    p50WorkMsMedian: medianOf(runs, 'p50WorkMs'),
    p95WorkMsMedian: medianOf(runs, 'p95WorkMs'),
    p99WorkMsMedian: medianOf(runs, 'p99WorkMs'),
    peakWorkMsMedian: medianOf(runs, 'peakWorkMs'),
    framesOverBudgetMedian: medianOf(runs, 'framesOverBudget'),
    growthRatioMedian: medianOf(runs, 'growthRatio'),
    syncTotalMsMedian: medianOf(runs, 'syncTotalMs'),
    frameWorkTotalMsMedian: medianOf(runs, 'frameWorkTotalMs'),
    overlapClampedMsMedian: medianOf(runs, 'overlapClampedMs'),
    libraryFlushMsMedian: medianOf(runs, 'libraryFlushMs'),
    mutationsMedian: medianOf(runs, 'mutations'),
    heapDeltaKbMedian: medianOf(runs, 'heapDeltaKb'),
    domNodes: runs.at(-1)?.domNodes ?? 0,
    outputHash: runs.at(-1)?.outputHash,
    outputLength: runs.at(-1)?.outputLength,
    parityChecksTotal: runs.some((run) => run.parityChecks !== null)
        ? runs.reduce((total, run) => total + (run.parityChecks ?? 0), 0)
        : null,
    parityMismatchesMax: maxOf(runs, 'parityMismatches'),
    firstParityMismatch: runs.find((run) => run.firstParityMismatch)?.firstParityMismatch ?? null
})

/**
 * Compares two normalized DOM projections list by list.
 *
 * @returns up to MAX_PROJECTION_DIFFERENCES human-readable differences
 */
const diffProjections = (ours, theirs) => {
    const differences = []
    let total = 0
    for (const key of ['headings', 'links', 'images', 'tables', 'codeBlocks']) {
        const left = ours[key]
        const right = theirs[key]
        if (left.length !== right.length) {
            total++
            if (differences.length < MAX_PROJECTION_DIFFERENCES) {
                differences.push(`${key}.length: ours ${left.length} · theirs ${right.length}`)
            }
        }
        for (let index = 0; index < Math.min(left.length, right.length); index++) {
            const a = JSON.stringify(left[index])
            const b = JSON.stringify(right[index])
            if (a === b) continue
            total++
            if (differences.length < MAX_PROJECTION_DIFFERENCES) {
                const clip = (value) => (value.length > 160 ? `${value.slice(0, 160)}…` : value)
                differences.push(`${key}[${index}]: ours ${clip(a)} · theirs ${clip(b)}`)
            }
        }
    }
    return { total, differences }
}

/** Drops the bulky DOM projection from a run before it is archived. */
const stripRun = ({ domProjection: _domProjection, ...run }) => run

const forceGc = async (page) => {
    await page.evaluate(() => globalThis.gc?.())
}

const runOnce = async (page, renderer, scenario) => {
    await forceGc(page)
    return await page.evaluate(
        async ({ selectedRenderer, scenarioId }) =>
            globalThis.__streamBenchmark.run(selectedRenderer, scenarioId),
        { selectedRenderer: renderer, scenarioId: scenario }
    )
}

const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info', '--js-flags=--expose-gc']
})

try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
    const pageErrors = []
    page.on('pageerror', (error) => {
        pageErrors.push(error.message)
        console.error('[page error]', error.message)
    })
    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForFunction(() => Boolean(globalThis.__streamBenchmark))

    const availableScenarios = await page.evaluate(() => globalThis.__streamBenchmark.scenarios)
    const scenarios = SCENARIO
        ? availableScenarios.filter((scenario) => scenario.id === SCENARIO)
        : availableScenarios
    if (scenarios.length === 0) throw new Error(`Unknown scenario: ${SCENARIO}`)
    const results = {}

    const logRun = (renderer, iteration, run, order) => {
        const parity =
            run.parityMismatches === null
                ? ''
                : ` · parity ${run.parityMismatches}/${run.parityChecks} mismatched${run.firstParityMismatch ? ` (first ${run.firstParityMismatch})` : ''}`
        console.log(
            `${renderer.padEnd(19)} run ${iteration + 1}${order ? ` [${order}]` : ''}: work ${run.totalWorkMs.toFixed(1)}ms total · avg ${run.avgWorkMs.toFixed(2)} · p95 ${run.p95WorkMs.toFixed(2)} · peak ${run.peakWorkMs.toFixed(1)} · over-budget ${run.framesOverBudget}/${run.frames} · growth ${run.growthRatio} · overlap clamped ${run.overlapClampedMs.toFixed(1)}ms${parity}`
        )
    }

    for (const scenario of scenarios) {
        const prefixLabel = scenario.prefix
            ? ` after a ${scenario.prefix.bytes}+ byte ${scenario.prefix.kind} prefix`
            : ''
        console.log(
            `\n=== ${scenario.id} (${scenario.corpus}, ${scenario.targetBytes}+ bytes${prefixLabel}, ${scenario.chunkSize} chars × ${scenario.updatesPerFrame}/frame, input ${scenario.inputMode}, mode ${MODE}) ===`
        )
        results[scenario.id] = {}
        const renderers = [OURS, THEIRS].filter((renderer) => scenario.renderers.includes(renderer))
        const skipped = [OURS, THEIRS].filter((renderer) => !renderers.includes(renderer))
        if (skipped.length > 0) {
            results[scenario.id].skippedRenderers = skipped
            console.log(
                `skipping ${skipped.join(', ')}: ${scenario.inputMode} input is not supported by that renderer`
            )
        }

        const runsByRenderer = Object.fromEntries(renderers.map((renderer) => [renderer, []]))
        const lastProjection = {}
        const record = (renderer, iteration, run, order) => {
            lastProjection[renderer] = run.domProjection
            const stripped = stripRun(run)
            if (order) stripped.order = order
            runsByRenderer[renderer].push(stripped)
            logRun(renderer, iteration, run, order)
        }

        if (MODE === 'paired') {
            for (let index = 0; index < WARMUPS; index++) {
                for (const renderer of renderers) await runOnce(page, renderer, scenario.id)
            }
            for (let index = 0; index < ITERATIONS; index++) {
                const pair = index % 2 === 0 ? renderers : [...renderers].reverse()
                const order = pair.join(' > ')
                for (const renderer of pair) {
                    record(renderer, index, await runOnce(page, renderer, scenario.id), order)
                }
            }
        } else {
            for (const renderer of renderers) {
                for (let index = 0; index < WARMUPS; index++) {
                    await runOnce(page, renderer, scenario.id)
                }
                for (let index = 0; index < ITERATIONS; index++) {
                    record(renderer, index, await runOnce(page, renderer, scenario.id), null)
                }
            }
        }
        for (const renderer of renderers) {
            const runs = runsByRenderer[renderer]
            results[scenario.id][renderer] = { runs, summary: summarize(runs) }
        }

        const ours = results[scenario.id][OURS].summary
        console.log(
            `parity (ours vs fresh parse): ${ours.parityMismatchesMax === 0 ? 'OK' : 'MISMATCH'} — max ${ours.parityMismatchesMax} mismatched of ${ours.parityChecksTotal} checks${ours.firstParityMismatch ? `; first at ${ours.firstParityMismatch}` : ''}`
        )
        if (!renderers.includes(THEIRS)) {
            console.log(
                `median total work: ours ${ours.totalWorkMsMedian}ms · p95 ${ours.p95WorkMsMedian}ms · frames over 16.7ms ${ours.framesOverBudgetMedian} (no competitor run)`
            )
            continue
        }

        const theirs = results[scenario.id][THEIRS].summary
        const oursRuns = runsByRenderer[OURS]
        const theirsRuns = runsByRenderer[THEIRS]
        const deltas = oursRuns.map((run, index) => theirsRuns[index].totalWorkMs - run.totalWorkMs)
        const pairedDeltaMsMedian = round(median(deltas))
        results[scenario.id].pairedDeltaMsMedian = pairedDeltaMsMedian
        results[scenario.id].pairedDeltasMs = deltas.map(round)

        const projection = diffProjections(lastProjection[OURS], lastProjection[THEIRS])
        results[scenario.id].domProjectionMatches = projection.total === 0
        results[scenario.id].domProjectionDifferenceCount = projection.total
        results[scenario.id].domProjectionDifferences = projection.differences
        const outputLengthRatio = round(theirs.outputLength / ours.outputLength)
        const outputComparable = outputLengthRatio >= 0.95 && outputLengthRatio <= 1.05
        results[scenario.id].outputLengthRatio = outputLengthRatio
        results[scenario.id].outputComparable = outputComparable
        if (!outputComparable) {
            console.warn(
                `WARNING output length mismatch for ${scenario.id}: svelte-markdown=${ours.outputLength}, svelte-streamdown=${theirs.outputLength} — treat this scenario's comparison as unverified`
            )
        }

        const ratio = round(theirs.totalWorkMsMedian / ours.totalWorkMsMedian)
        const winner = ratio >= 1 ? 'svelte-markdown' : 'svelte-streamdown'
        const factor = ratio >= 1 ? ratio : round(1 / ratio)
        results[scenario.id].workRatioTheirsOverOurs = ratio
        console.log(
            `median total work: ours ${ours.totalWorkMsMedian}ms · theirs ${theirs.totalWorkMsMedian}ms → ${winner} does ${factor}x less main-thread work`
        )
        console.log(
            `median p95 frame work: ours ${ours.p95WorkMsMedian}ms · theirs ${theirs.p95WorkMsMedian}ms · frames over 16.7ms: ours ${ours.framesOverBudgetMedian} · theirs ${theirs.framesOverBudgetMedian}`
        )
        console.log(
            `paired delta (theirs − ours total work, median of ${deltas.length} ${MODE === 'paired' ? 'pairs' : 'index-matched runs'}): ${pairedDeltaMsMedian}ms${pairedDeltaMsMedian > 0 ? ' — ours does less work' : ' — theirs does less work'}`
        )
        console.log(
            `output check: ${outputComparable ? 'comparable' : 'NOT comparable'} normalized text lengths (ratio ${outputLengthRatio}; hashes intentionally differ across renderer markup)`
        )
        console.log(
            `dom projection: ${projection.total === 0 ? 'MATCH' : `${projection.total} difference(s)`}`
        )
        for (const difference of projection.differences) console.log(`  - ${difference}`)
    }

    const output = {
        metadata: {
            capturedAt: new Date().toISOString(),
            url: URL,
            iterations: ITERATIONS,
            warmups: WARMUPS,
            mode: MODE,
            userAgent: await page.evaluate(() => navigator.userAgent),
            pageErrors
        },
        results
    }
    console.log('\n=== JSON ===')
    console.log(JSON.stringify(output, null, 2))
} finally {
    await browser.close()
}
