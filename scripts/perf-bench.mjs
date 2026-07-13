/**
 * Headless-Chromium runner for the perf-bench fixture
 * (`src/routes/test/perf-bench/+page.svelte`).
 *
 * Drives each preset twice — COLD (first navigation) and WARM (after
 * reload) — and dumps a JSON blob of the page's stats line so each
 * commit can be attributed to a specific before/after delta.
 *
 * Usage:
 *     pnpm dev                               # in another shell
 *     pnpm perf:bench                        # runs against http://localhost:8233
 *     PERF_BENCH_URL=http://localhost:9000 pnpm perf:bench   # custom URL
 *
 * Caveat: headless Chromium is not a DevTools session — absolute
 * numbers differ from a manual capture. The deltas between commits
 * stay valid.
 */

import { chromium } from '@playwright/test'

const URL = process.env.PERF_BENCH_URL ?? 'http://localhost:8233/test/perf-bench'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function readStats(page) {
    return await page.$eval('[data-testid="perf-stats"]', (el) =>
        el.textContent.replace(/\s+/g, ' ').trim()
    )
}

function parseStats(s) {
    const grab = (key) => {
        const m = s.match(new RegExp(`${key}=([^\\s·]+)`))
        return m ? m[1] : null
    }
    const num = (v) => (v == null ? null : Number.isNaN(Number(v)) ? v : Number(v))
    return {
        scenario: grab('scenario'),
        srcKb: num(grab('srcKb')),
        tokenCount: num(grab('tokenCount')),
        parseColdMs: num(grab('parseColdMs')),
        parseWarmMs: num(grab('parseWarmMs')),
        lexMs: num(grab('lexMs')),
        cleanupMs: num(grab('cleanupMs')),
        hashMs: num(grab('hashMs')),
        firstPaintMs: num(grab('firstPaintMs')),
        // Render-attribution column: firstPaintMs minus parseColdMs.
        // Surfaces parse-side wins that pure firstPaint would hide
        // when render dominates.
        renderOnlyMs: num(grab('renderOnlyMs')),
        domNodes: num(grab('domNodes')),
        charsPerSec: num(grab('charsPerSec')),
        // Dev-mode Parser-instance counter — the non-wall-clock signal
        // that cracked open the original render investigation.
        parserInstances: num(grab('parserInstances')),
        // Per-scenario observer snapshots (filtered to the scenario's
        // [start, end] window — not the rolling-10s aggregate below).
        scenarioLongestTaskMs: num(grab('scenarioLongestTaskMs')),
        scenarioMutations: num(grab('scenarioMutations')),
        scenarioLoafScriptMaxMs: num(grab('scenarioLoafScriptMaxMs')),
        cacheIters: num(grab('cacheIters')),
        cacheTotalMs: num(grab('cacheTotalMs')),
        cacheAvgMs: num(grab('cacheAvgMs')),
        cacheP95Ms: num(grab('cacheP95Ms')),
        cachePeakMs: num(grab('cachePeakMs')),
        streamChunks: num(grab('streamChunks')),
        streamTotalMs: num(grab('streamTotalMs')),
        streamAvgMs: num(grab('streamAvgMs')),
        streamP95Ms: num(grab('streamP95Ms')),
        streamPeakMs: num(grab('streamPeakMs')),
        chunksPerSec: num(grab('chunksPerSec')),
        parseChunkAvgMs: num(grab('parseChunkAvgMs')),
        parseChunkP95Ms: num(grab('parseChunkP95Ms')),
        parseChunkPeakMs: num(grab('parseChunkPeakMs')),
        headingCount: num(grab('headingCount')),
        headingIdMismatches: num(grab('headingIdMismatches')),
        // Bursty-stream-only: inter-chunk gap distribution.
        streamGapAvgMs: num(grab('streamGapAvgMs')),
        streamGapP95Ms: num(grab('streamGapP95Ms')),
        streamGapPeakMs: num(grab('streamGapPeakMs')),
        // stream-extensions-only: per-chunk parse cost over the first vs last
        // third of the stream and their ratio. extGrowthRatio ≈ 1 ⇒ the
        // incremental tail-window is engaged; a climbing ratio is the O(N²)
        // re-lex signature. extTailWindow is the derived human label.
        extParseFirstMs: num(grab('extParseFirstMs')),
        extParseLastMs: num(grab('extParseLastMs')),
        extGrowthRatio: num(grab('extGrowthRatio')),
        extTailWindow: grab('extTailWindow'),
        longestTaskMs: grab('longestTaskMs'),
        longTasks10s: grab('longTasks10s'),
        rafP95Ms: num(grab('rafP95Ms')),
        mutations10s: num(grab('mutations10s')),
        loaf10s: grab('loaf10s'),
        loafScriptMaxMs: grab('loafScriptMaxMs'),
        heapAllocKbPerSec: grab('heapAllocKbPerSec')
    }
}

/**
 * Waits for the page's `scenario` field to flip to `${testId}-done`,
 * meaning the in-page scenario function returned and the stats line is
 * fully populated.
 */
async function waitForScenarioDone(page, testId, timeoutMs) {
    await page.waitForFunction(
        (id) => {
            const el = document.querySelector('[data-testid="perf-stats"]')
            return !!el && el.textContent.includes(`scenario=${id}-done`)
        },
        testId,
        { timeout: timeoutMs }
    )
}

async function runDocScenario(page, testId, { timeout = 60_000 } = {}) {
    await page.locator('[data-testid="clear"]').click({ timeout })
    // Give the page a beat to drop the previous scenario's mounted DOM
    // before we click the next preset — otherwise the click can wait
    // behind a long-running unmount task and time out.
    await sleep(500)
    await page.locator(`[data-testid="${testId}"]`).click({ timeout })
    await waitForScenarioDone(page, testId, timeout)
    // Allow the 250ms rolling-window refresh tick to fire at least once
    // so observer-derived fields (longestTaskMs, mutations10s, …) are
    // reflected in the scrape. Per-doc fields are already final.
    await sleep(400)
    return parseStats(await readStats(page))
}

async function runCacheWarm(page) {
    return runDocScenario(page, 'cache-warm', { timeout: 30_000 })
}

async function runStreaming(page) {
    // Streaming replays the corpus at ~30 chunks/sec; ~150 chunks → ~5s
    // wall clock plus per-chunk render time.
    return runDocScenario(page, 'stream-30tps', { timeout: 60_000 })
}

async function runStreamingBursty(page) {
    // Bursty variant: jittered chunk sizes (1–10 typical, occasional
    // 30–50 burst) with delays in [5,30]/[30,80]/[80,200]ms buckets.
    // Wall-clock varies more than steady 30tps, so widen the timeout.
    return runDocScenario(page, 'stream-bursty', { timeout: 120_000 })
}

async function runStreamingLarge(page) {
    // Tight-loop ~50KB append stream. This catches accidental O(document)
    // work per flush in the live Svelte render path.
    return runDocScenario(page, 'stream-large', { timeout: 120_000 })
}

async function runStreamingExtensions(page) {
    // Same ~30tps word-chunk cadence as `stream-30tps`, but the corpus mixes
    // katex math + GitHub alerts and the parser runs with those extensions
    // registered. Historically that disabled the incremental tail-window and
    // re-lexed the whole accumulated source per chunk — watch `extGrowthRatio`.
    return runDocScenario(page, 'stream-extensions', { timeout: 120_000 })
}

async function runAll(label, page) {
    console.log(`\n=== ${label} run ===`)
    const out = {}

    const scenarios = [
        ['parse1kb', 'parse-1kb', { timeout: 30_000 }],
        ['parse50kb', 'parse-50kb', { timeout: 60_000 }],
        ['parse500kb', 'parse-500kb', { timeout: 180_000 }],
        ['parseHtmlHeavy', 'parse-html-heavy', { timeout: 60_000 }],
        ['parseTableHeavy', 'parse-table-heavy', { timeout: 60_000 }],
        // Mixed-shape corpus that defeats optimizations only winning on
        // the highly-repetitive `generateLarge` shapes.
        ['parseRealistic', 'parse-realistic', { timeout: 90_000 }],
        // Same 50KB body as `parse50kb` but mounted with custom
        // markdown + html snippet overrides — drives the slow dispatch
        // path so override-path regressions can't slip through.
        ['parse50kbOverridden', 'parse-50kb-overridden', { timeout: 90_000 }]
    ]

    for (const [key, testId, opts] of scenarios) {
        console.log(`  → ${testId}…`)
        out[key] = await runDocScenario(page, testId, opts)
        console.log('   ', JSON.stringify(out[key]))
    }

    console.log('  → cache-warm…')
    out.cacheWarm = await runCacheWarm(page)
    console.log('   ', JSON.stringify(out.cacheWarm))

    console.log('  → stream-30tps…')
    out.stream30tps = await runStreaming(page)
    console.log('   ', JSON.stringify(out.stream30tps))

    console.log('  → stream-bursty…')
    out.streamBursty = await runStreamingBursty(page)
    console.log('   ', JSON.stringify(out.streamBursty))

    console.log('  → stream-large…')
    out.streamLarge = await runStreamingLarge(page)
    console.log('   ', JSON.stringify(out.streamLarge))

    console.log('  → stream-extensions…')
    out.streamExtensions = await runStreamingExtensions(page)
    console.log('   ', JSON.stringify(out.streamExtensions))

    return out
}

;(async () => {
    const browser = await chromium.launch({
        headless: true,
        // Needed for the perf-bench fixture's heap-delta metric.
        // performance.memory.usedJSHeapSize is quantized to ~100KB without
        // this flag, which rounds most per-rAF deltas to 0.
        args: ['--enable-precise-memory-info']
    })
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
    const page = await context.newPage()

    page.on('console', (msg) => {
        if (msg.type() === 'error') console.log('  [browser error]', msg.text())
    })
    page.on('pageerror', (err) => console.log('  [page error]', err.message))

    await page.goto(URL, { waitUntil: 'load' })
    await page.waitForSelector('[data-testid="perf-stats"]')
    await sleep(1000)
    const cold = await runAll('COLD', page)

    await page.reload({ waitUntil: 'load' })
    await page.waitForSelector('[data-testid="perf-stats"]')
    await sleep(1000)
    const warm = await runAll('WARM', page)

    await browser.close()

    const allResults = { cold, warm, capturedAt: new Date().toISOString(), url: URL }
    console.log('\n=== JSON ===')
    console.log(JSON.stringify(allResults, null, 2))
})().catch((err) => {
    console.error(err)
    process.exit(1)
})
