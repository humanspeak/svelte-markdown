// Node reproduction of the streaming parity mismatches against built dist/.
const WT = '/home/jason-kummerl/GitHub/svelte-markdown/.claude/worktrees/agent-a8973dc5429cda016'
const { IncrementalParser } = await import(`${WT}/dist/utils/incremental-parser.js`)
const { reuseStableTokenArray } = await import(`${WT}/dist/utils/streaming-token-reuse.js`)
const { lexAndClean } = await import(`${WT}/dist/utils/parse-and-cache.js`)
const buildParserOptions = () => ({
    async: false,
    breaks: false,
    gfm: true,
    pedantic: false,
    renderer: null,
    silent: false,
    tokenizer: null,
    walkTokens: null,
    headerIds: true,
    headerPrefix: ''
})

const section = (index) => `## Section ${index}: Streaming performance

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
const prose = () => {
    let s = '# Long streaming benchmark\n\n'
    let i = 0
    while (s.length < 24000) s += section(i++)
    return s
}
const citations = () => {
    let d = '## Sources\n\n'
    for (let i = 1; i <= 40; i++) d += `[${i}]: https://example.com/source/${i}\n`
    let b = '# Findings\n\n'
    let p = 0
    while (b.length + d.length < 24000) {
        const a = (p % 40) + 1
        const c = ((p + 7) % 40) + 1
        b += `Paragraph ${p} summarises the **${a}th** result and its *follow-up* [${a}] before contrasting it with the replication study [${c}], which reported a slightly different \`effect\` size.\n\n`
        p++
    }
    return b + d
}

const eq = (a, b, path = '') => {
    if (a === b) return null
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object')
        return `${path} (${JSON.stringify(a)?.slice(0, 60)} vs ${JSON.stringify(b)?.slice(0, 60)})`
    if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return `${path}.length (${a.length} vs ${b.length})`
        for (let i = 0; i < a.length; i++) {
            const m = eq(a[i], b[i], `${path}[${i}]`)
            if (m) return m
        }
        return null
    }
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        const m = eq(a[k], b[k], `${path}.${k}`)
        if (m) return m
    }
    return null
}

for (const [name, source] of [
    ['prose-mixed', prose()],
    ['citations', citations()]
]) {
    const options = buildParserOptions({}, [])
    const parser = new IncrementalParser(options)
    let tokens = []
    let first = null
    let mismatches = 0
    let checks = 0
    const slices = []
    for (let o = 32; o < source.length; o += 32) slices.push(source.slice(0, o))
    slices.push(source)
    slices.forEach((slice, index) => {
        const r = parser.update(slice)
        tokens = r.canReuse ? reuseStableTokenArray(tokens, r.tokens, r.divergeAt) : r.tokens
        if ((index + 1) % 25 === 0 || index === slices.length - 1) {
            checks++
            const fresh = lexAndClean(slice, options, false)
            const m = eq(tokens, fresh)
            if (m) {
                mismatches++
                if (!first) {
                    first = `${m} at ${slice.length}`
                    if (m.includes('.length')) {
                        console.log(
                            name,
                            'streamed types:',
                            tokens.map((t) => t.type).join(','),
                            '\nfresh types:   ',
                            fresh.map((t) => t.type).join(',')
                        )
                    }
                }
            }
            // Also compare the parser's own output (pre-reuse) with the fresh parse.
            const raw = eq(r.tokens, fresh)
            if (raw && checks < 3) console.log(name, 'parser output (before reuse) differs:', raw)
        }
    })
    console.log(`${name}: ${mismatches}/${checks} mismatched; first ${first}`)
}
