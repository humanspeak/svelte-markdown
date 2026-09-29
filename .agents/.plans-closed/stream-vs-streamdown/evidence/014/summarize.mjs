// Summarize final-run-N.json (+ Plan 006 baseline) into the README tables.
// Usage: node summarize.mjs   (run from this directory)
import { readFileSync } from 'node:fs'
const load = (f) => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8')).results
const runs = [load('./final-run-1.json'), load('./final-run-2.json')]
const base = [load('../006/paired-run-1.json'), load('../006/paired-run-2.json')]
const O = 'svelte-markdown',
    T = 'svelte-streamdown'
const fmt = (n, d = 0) =>
    n == null
        ? '—'
        : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
console.log(
    '| Scenario | Ours total | Theirs total | Paired delta (theirs − ours) | Ratio theirs ÷ ours | Ours avg/frame | Ours p95 | Theirs p95 | Ours over-budget | Theirs over-budget | Ours lib flush | Parity mismatches (checks) | DOM elements ours / theirs | DOM projection | vs 006 ours total (Δ%) |'
)
console.log('|' + ' --- |'.repeat(15))
for (const id of Object.keys(runs[0])) {
    const r = runs.map((x) => x[id])
    const o = r.map((x) => x[O].summary),
        t = r.map((x) => x[T]?.summary)
    const b = base.map((x) => x[id]?.[O]?.summary)
    const vs = b[0]
        ? o
              .map(
                  (s, i) =>
                      `${(((s.totalWorkMsMedian - b[i].totalWorkMsMedian) / b[i].totalWorkMsMedian) * 100).toFixed(1)}%`
              )
              .join(' / ')
        : 'new'
    console.log(
        `| \`${id}\` | ${o.map((s) => fmt(s.totalWorkMsMedian)).join(' / ')} | ${t[0] ? t.map((s) => fmt(s.totalWorkMsMedian)).join(' / ') : 'skipped'} | ${t[0] ? r.map((x) => fmt(x.pairedDeltaMsMedian)).join(' / ') : '—'} | ${t[0] ? r.map((x) => fmt(x.workRatioTheirsOverOurs, 2)).join(' / ') : '—'} | ${o.map((s) => fmt(s.avgWorkMsMedian, 2)).join(' / ')} | ${o.map((s) => fmt(s.p95WorkMsMedian, 1)).join(' / ')} | ${t[0] ? t.map((s) => fmt(s.p95WorkMsMedian, 1)).join(' / ') : '—'} | ${o.map((s) => s.framesOverBudgetMedian).join(' / ')} of ${o[0].frames} | ${t[0] ? t.map((s) => s.framesOverBudgetMedian).join(' / ') : '—'} | ${o.map((s) => fmt(s.libraryFlushMsMedian)).join(' / ')} | ${o.map((s) => `${s.parityMismatchesMax} (${s.parityChecksTotal})`).join(' / ')} | ${o[0].domNodes}${t[0] ? ' / ' + t[0].domNodes : ''} | ${t[0] ? r.map((x) => (x.domProjectionMatches ? 'MATCH' : `${x.domProjectionDifferenceCount} diff`)).join(' / ') : '—'} | ${vs} |`
    )
}
console.log('\nPer-run maxima (every run, not medians):')
for (const id of Object.keys(runs[0])) {
    const line = runs.map((x, i) => {
        const o = x[id][O].runs,
            t = x[id][T]?.runs ?? []
        const mx = (a, k) => Math.max(...a.map((q) => q[k] ?? 0))
        return (
            `suite ${i + 1}: ours over-budget per run [${o.map((q) => q.framesOverBudget).join(',')}] parity max ${mx(o, 'parityMismatches')}` +
            (t.length ? `; theirs over-budget [${t.map((q) => q.framesOverBudget).join(',')}]` : '')
        )
    })
    console.log(`- ${id}: ${line.join(' | ')}`)
}
console.log('\nPaired deltas per pair:')
for (const id of Object.keys(runs[0]))
    console.log(`- ${id}: ${runs.map((x) => (x[id].pairedDeltasMs ?? []).join(', ')).join(' / ')}`)
console.log('\nDOM projection differences:')
for (const id of Object.keys(runs[0])) {
    const d = runs[0][id].domProjectionDifferences
    if (d && d.length) console.log(`- ${id}: ${JSON.stringify(d).slice(0, 400)}`)
}
