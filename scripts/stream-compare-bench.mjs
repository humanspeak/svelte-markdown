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
 *   STREAM_COMPARE_WARMUPS     discarded warmup runs (default 1)
 *   STREAM_COMPARE_SCENARIO    run a single scenario id
 */

import { chromium } from '@playwright/test'

const URL = process.env.STREAM_COMPARE_URL ?? 'http://localhost:4173/test/stream-compare'
const ITERATIONS = Number(process.env.STREAM_COMPARE_ITERATIONS ?? 5)
const WARMUPS = Number(process.env.STREAM_COMPARE_WARMUPS ?? 1)
const SCENARIO = process.env.STREAM_COMPARE_SCENARIO
const renderers = ['svelte-markdown', 'svelte-streamdown']

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
    libraryFlushMsMedian: medianOf(runs, 'libraryFlushMs'),
    mutationsMedian: medianOf(runs, 'mutations'),
    heapDeltaKbMedian: medianOf(runs, 'heapDeltaKb'),
    domNodes: runs.at(-1)?.domNodes ?? 0,
    outputHash: runs.at(-1)?.outputHash,
    outputLength: runs.at(-1)?.outputLength
})

const forceGc = async (page) => {
    await page.evaluate(() => globalThis.gc?.())
}

const runOnce = async (page, renderer, scenario) => {
    await forceGc(page)
    return page.evaluate(
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

    for (const scenario of scenarios) {
        console.log(
            `\n=== ${scenario.id} (${scenario.corpus}, ${scenario.targetBytes}+ bytes, ${scenario.chunkSize} chars × ${scenario.updatesPerFrame}/frame) ===`
        )
        results[scenario.id] = {}

        for (const renderer of renderers) {
            for (let index = 0; index < WARMUPS; index++) {
                await runOnce(page, renderer, scenario.id)
            }

            const runs = []
            for (let index = 0; index < ITERATIONS; index++) {
                const run = await runOnce(page, renderer, scenario.id)
                runs.push(run)
                console.log(
                    `${renderer.padEnd(19)} run ${index + 1}: work ${run.totalWorkMs.toFixed(1)}ms total · avg ${run.avgWorkMs.toFixed(2)} · p95 ${run.p95WorkMs.toFixed(2)} · peak ${run.peakWorkMs.toFixed(1)} · over-budget ${run.framesOverBudget}/${run.frames} · growth ${run.growthRatio}`
                )
            }
            results[scenario.id][renderer] = { runs, summary: summarize(runs) }
        }

        const ours = results[scenario.id]['svelte-markdown'].summary
        const theirs = results[scenario.id]['svelte-streamdown'].summary
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
            `output check: ${outputComparable ? 'comparable' : 'NOT comparable'} normalized text lengths (ratio ${outputLengthRatio}; hashes intentionally differ across renderer markup)`
        )
    }

    const output = {
        metadata: {
            capturedAt: new Date().toISOString(),
            url: URL,
            iterations: ITERATIONS,
            warmups: WARMUPS,
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
