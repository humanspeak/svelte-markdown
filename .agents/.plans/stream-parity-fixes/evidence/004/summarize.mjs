// Tabulates the plan 004 evidence: A/A control, paired A/B and ours vs Streamdown.
// Run: node .agents/.plans/stream-parity-fixes/evidence/004/summarize.mjs > summary.txt
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const load = (name) => {
    const path = join(dir, name)
    return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null
}
const loadAvg = (name) => {
    const path = join(dir, name)
    if (!existsSync(path)) return '?'
    return (
        readFileSync(path, 'utf8')
            .split('\n')[0]
            .match(/load average: ([\d.]+)/)?.[1] ?? '?'
    )
}
const fmt = (value, digits = 0) =>
    value === null || value === undefined
        ? '—'
        : Number(value).toLocaleString('en-US', {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits
          })
const fmtCount = (value) =>
    value === null || value === undefined
        ? '—'
        : Number(value).toLocaleString('en-US', { maximumFractionDigits: 1 })
const perRun = (runs, key) => runs.map((run) => run[key]).join(',')

const abSection = (prefix, scenarios, repeats) => {
    console.log(`\n## ${prefix}\n`)
    console.log(
        '| Scenario | Repeat | Load | A total | B total | Paired delta ms (% of A) | A lib flush | B lib flush | A p95 | B p95 | A over-budget | B over-budget | Parity A / B (checks) | Hash / DOM |'
    )
    console.log(
        '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
    )
    for (const scenario of scenarios) {
        for (const repeat of repeats) {
            const file = `${prefix}${repeat ? `-${repeat}` : ''}-${scenario}`
            const data = load(`${file}.json`)
            if (!data) continue
            const result = data.results[scenario]
            const a = result['svelte-markdown@A'].summary
            const b = result['svelte-markdown@B'].summary
            console.log(
                `| \`${scenario}\` | ${repeat || '—'} | ${loadAvg(`${file}.log`)} | ${fmt(a.totalWorkMsMedian)} | ${fmt(b.totalWorkMsMedian)} | ${fmt(result.pairedDeltaMsMedian, 1)} (${fmt(result.pairedDeltaPctOfA, 2)}%) | ${fmt(a.libraryFlushMsMedian)} | ${fmt(b.libraryFlushMsMedian)} | ${fmt(a.p95WorkMsMedian, 1)} | ${fmt(b.p95WorkMsMedian, 1)} | ${fmtCount(a.framesOverBudgetMedian)} | ${fmtCount(b.framesOverBudgetMedian)} | ${a.parityMismatchesMax} / ${b.parityMismatchesMax} (${a.parityChecksTotal}) | ${result.outputHashMatches ? 'MATCH' : 'DIFF'} / ${result.domProjectionMatches ? 'MATCH' : 'DIFF'} |`
            )
        }
    }
    console.log('\nPer-pair deltas (A − B, ms) and per-run over-budget (A | B):\n')
    for (const scenario of scenarios) {
        for (const repeat of repeats) {
            const file = `${prefix}${repeat ? `-${repeat}` : ''}-${scenario}`
            const data = load(`${file}.json`)
            if (!data) continue
            const result = data.results[scenario]
            console.log(
                `- \`${scenario}\` ${repeat || ''}: ${result.pairedDeltasMs.map((d) => fmt(d, 1)).join(', ')} · over-budget A [${perRun(result['svelte-markdown@A'].runs, 'framesOverBudget')}] | B [${perRun(result['svelte-markdown@B'].runs, 'framesOverBudget')}] · page errors ${data.metadata.pageErrors.length}`
            )
        }
    }
}

abSection('aa-control', ['prose-mixed', 'long-list'], [''])
abSection(
    'ab-run',
    ['prose-mixed', 'long-list', 'long-table', 'long-code-fence', 'citations', 'prefix-384kb'],
    [1, 2]
)

console.log('\n## vs-streamdown\n')
console.log(
    '| Scenario | Repeat | Load | Ours total | Theirs total | Paired delta (theirs − ours) | Ratio theirs ÷ ours | Ours avg | Ours p95 | Theirs p95 | Ours over-budget | Theirs over-budget | Ours lib flush | Parity (checks) | Output comparable (ratio) | DOM projection |'
)
console.log(
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |'
)
const vsScenarios = ['citations', 'prose-mixed', 'loose-ordered-list', 'html-blocks']
for (const scenario of vsScenarios) {
    for (const repeat of [1, 2]) {
        const file = `vs-streamdown-${repeat}-${scenario}`
        const data = load(`${file}.json`)
        if (!data) continue
        const result = data.results[scenario]
        const ours = result['svelte-markdown'].summary
        const theirs = result['svelte-streamdown'].summary
        console.log(
            `| \`${scenario}\` | ${repeat} | ${loadAvg(`${file}.log`)} | ${fmt(ours.totalWorkMsMedian)} | ${fmt(theirs.totalWorkMsMedian)} | ${fmt(result.pairedDeltaMsMedian, 1)} | ${fmt(result.workRatioTheirsOverOurs, 2)} | ${fmt(ours.avgWorkMsMedian, 2)} | ${fmt(ours.p95WorkMsMedian, 1)} | ${fmt(theirs.p95WorkMsMedian, 1)} | ${fmtCount(ours.framesOverBudgetMedian)} of ${ours.frames} | ${fmtCount(theirs.framesOverBudgetMedian)} | ${fmt(ours.libraryFlushMsMedian)} | ${ours.parityMismatchesMax} (${ours.parityChecksTotal}) | ${result.outputComparable ? 'yes' : 'NO'} (${result.outputLengthRatio}) | ${result.domProjectionMatches ? 'MATCH' : result.domProjectionDifferences.join('; ')} |`
        )
    }
}
console.log(
    '\nPer-pair deltas (theirs − ours, ms), per-run over-budget (ours | theirs), DOM nodes (ours / theirs):\n'
)
for (const scenario of vsScenarios) {
    for (const repeat of [1, 2]) {
        const data = load(`vs-streamdown-${repeat}-${scenario}.json`)
        if (!data) continue
        const result = data.results[scenario]
        const ours = result['svelte-markdown']
        const theirs = result['svelte-streamdown']
        console.log(
            `- \`${scenario}\` ${repeat}: ${result.pairedDeltasMs.map((d) => fmt(d, 1)).join(', ')} · over-budget [${perRun(ours.runs, 'framesOverBudget')}] | [${perRun(theirs.runs, 'framesOverBudget')}] · DOM nodes ${ours.summary.domNodes} / ${theirs.summary.domNodes} · page errors ${data.metadata.pageErrors.length}`
        )
    }
}
