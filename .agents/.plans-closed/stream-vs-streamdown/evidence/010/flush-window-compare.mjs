import fs from 'node:fs'
const load = (tag) => {
    const trace = JSON.parse(fs.readFileSync(`/tmp/${tag}-long-list.trace.json`))
    const ev = trace.traceEvents ?? trace
    const begins = new Map()
    const iv = []
    for (const e of ev) {
        if (e.name !== 'svelte-markdown:stream-flush') continue
        if (e.ph === 'b') begins.set(e.id2?.local ?? e.id, e.ts)
        else if (e.ph === 'e') {
            const k = e.id2?.local ?? e.id
            iv.push([begins.get(k), e.ts])
        } else if (e.ph === 'X') iv.push([e.ts, e.ts + e.dur])
    }
    iv.sort((a, b) => a[0] - b[0])
    const p = JSON.parse(fs.readFileSync(`/tmp/${tag}-long-list.cpuprofile`))
    const byId = new Map(p.nodes.map((n) => [n.id, n]))
    const cat = new Map()
    const fn = new Map()
    let t = p.startTime,
        j = 0
    for (let i = 0; i < p.samples.length; i++) {
        const d = p.timeDeltas[i]
        t += d
        while (j < iv.length && iv[j][1] < t) j++
        if (j >= iv.length || t < iv[j][0]) continue
        const cf = byId.get(p.samples[i]).callFrame
        const file = cf.url.split('/').pop()
        const c = !file
            ? cf.functionName
            : file.startsWith('BCiv')
              ? 'svelte runtime'
              : `lib line ${cf.lineNumber + 1}`
        cat.set(c, (cat.get(c) ?? 0) + d / 1000)
        const k = `${cf.functionName || '(anon)'} ${c}`
        fn.set(k, (fn.get(k) ?? 0) + d / 1000)
    }
    return { cat, fn, flushMs: iv.reduce((s, [a, b]) => s + (b - a), 0) / 1000, n: iv.length }
}
for (const tag of ['before', 'after']) {
    const r = load(tag)
    console.log(`== ${tag}: ${r.n} flushes, ${r.flushMs.toFixed(0)} ms`)
    for (const [k, v] of [...r.cat].sort((a, b) => b[1] - a[1]).slice(0, 10))
        console.log('  ', k.padEnd(28), v.toFixed(0))
    for (const [k, v] of [...r.fn].sort((a, b) => b[1] - a[1]).slice(0, 12))
        console.log('     ', k.padEnd(40), v.toFixed(0))
}
