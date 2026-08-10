/**
 * Production-browser benchmark comparing append-only reactive updates in
 * @humanspeak/svelte-markdown and svelte-streamdown.
 *
 * Start a production preview first:
 *   pnpm build && pnpm preview
 * Then run:
 *   pnpm perf:stream-compare
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

const summarize = (runs) => ({
    iterations: runs.length,
    totalMsMedian: round(median(runs.map((run) => run.totalMs))),
    p95MsMedian: round(median(runs.map((run) => run.p95Ms))),
    peakMsMedian: round(median(runs.map((run) => run.peakMs))),
    settleMsMedian: round(median(runs.map((run) => run.settleMs))),
    chunksPerSecMedian: round(median(runs.map((run) => run.chunksPerSec))),
    mutationsMedian: round(median(runs.map((run) => run.mutations))),
    heapDeltaKbMedian: round(
        median(runs.map((run) => run.heapDeltaKb).filter((value) => value !== null))
    ),
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
    page.on('pageerror', (error) => console.error('[page error]', error.message))
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
            `\n=== ${scenario.id} (${scenario.mode}, ${scenario.targetBytes} bytes / ${scenario.chunkSize} chars) ===`
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
                    `${renderer.padEnd(19)} run ${index + 1}: ${run.totalMs.toFixed(1)}ms · ${run.chunksPerSec.toFixed(1)} chunks/s · p95 ${run.p95Ms.toFixed(2)}ms`
                )
            }
            results[scenario.id][renderer] = { runs, summary: summarize(runs) }
        }

        const ours = results[scenario.id]['svelte-markdown'].summary
        const theirs = results[scenario.id]['svelte-streamdown'].summary
        const outputLengthRatio = round(theirs.outputLength / ours.outputLength)
        if (outputLengthRatio < 0.95 || outputLengthRatio > 1.05) {
            throw new Error(
                `Output length mismatch for ${scenario.id}: svelte-markdown=${ours.outputLength}, svelte-streamdown=${theirs.outputLength}`
            )
        }

        const ratio = round(theirs.totalMsMedian / ours.totalMsMedian)
        const winner = ratio >= 1 ? 'svelte-markdown' : 'svelte-streamdown'
        const factor = ratio >= 1 ? ratio : round(1 / ratio)
        console.log(`winner: ${winner} (${factor}x faster by median total time)`)
        console.log(
            `output check: comparable normalized text lengths (ratio ${outputLengthRatio}; hashes intentionally differ across renderer markup)`
        )
    }

    const output = {
        metadata: {
            capturedAt: new Date().toISOString(),
            url: URL,
            iterations: ITERATIONS,
            warmups: WARMUPS,
            userAgent: await page.evaluate(() => navigator.userAgent)
        },
        results
    }
    console.log('\n=== JSON ===')
    console.log(JSON.stringify(output, null, 2))
} finally {
    await browser.close()
}
