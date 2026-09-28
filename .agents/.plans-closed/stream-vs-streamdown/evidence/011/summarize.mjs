// Summarize stream-compare-bench JSON files: node summarize.mjs file.json...
import { readFileSync } from 'node:fs'
const median = (v) => {
    const s = [...v].sort((a, b) => a - b)
    const m = Math.floor(s.length / 2)
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const r = (x) => (x === null || x === undefined ? '—' : Math.round(x * 100) / 100)
for (const file of process.argv.slice(2)) {
    const json = JSON.parse(readFileSync(file, 'utf8'))
    for (const [scenario, sides] of Object.entries(json.results)) {
        const names = Object.keys(sides).filter((k) => sides[k]?.runs)
        console.log(`# ${file} :: ${scenario}`)
        for (const name of names) {
            const runs = sides[name].runs
            const m = (k) =>
                median(runs.map((x) => x[k]).filter((x) => x !== null && x !== undefined))
            console.log(
                `  ${name.padEnd(20)} total ${r(m('totalWorkMs'))} avg ${r(m('avgWorkMs'))} p95 ${r(m('p95WorkMs'))} over ${r(m('framesOverBudget'))}/${runs[0].frames} flush ${runs[0].libraryFlushMs === null ? '—' : r(m('libraryFlushMs'))} parityMax ${runs.some((x) => x.parityMismatches !== null) ? Math.max(...runs.map((x) => x.parityMismatches ?? 0)) : '—'} checks ${runs.reduce((t, x) => t + (x.parityChecks ?? 0), 0)} hash ${runs.at(-1).outputHash}`
            )
        }
        if (names.length === 2) {
            const [a, b] = names
            const deltas = sides[a].runs.map((x, i) => x.totalWorkMs - sides[b].runs[i].totalWorkMs)
            const d = median(deltas)
            console.log(
                `  delta ${a} − ${b}: median ${r(d)} (${r((100 * d) / median(sides[a].runs.map((x) => x.totalWorkMs)))}% of ${a}) pairs [${deltas.map(r).join(', ')}]`
            )
        }
    }
}
