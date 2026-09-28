// Repo root whose built dist/ is exercised; override with REPRO_ROOT.
const WT = process.env.REPRO_ROOT ?? '/home/jason-kummerl/GitHub/svelte-markdown'
const { IncrementalParser } = await import(`${WT}/dist/utils/incremental-parser.js`)
const { reuseStableTokenArray } = await import(`${WT}/dist/utils/streaming-token-reuse.js`)
const { lexAndClean } = await import(`${WT}/dist/utils/parse-and-cache.js`)
const options = {
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
}

const section = (index) => `## Section ${index}: Streaming performance

This paragraph contains **bold text**, *emphasis*, \`inline code\`, and a
[stable link](https://example.com/${index}) so each renderer performs realistic inline work.

- Item ${index}.1 with a short explanation
- Item ${index}.2 with another **formatted value**
- Item ${index}.3 with a nested detail
  - Nested ${index}.a
  - Nested ${index}.b

> A blockquote for section ${index} keeps the block shapes varied.

`
const source = '# Long streaming benchmark\n\n' + section(0) + section(1)

// Find the first 32-byte step at which streamed and fresh top-level shapes diverge.
const parser = new IncrementalParser(options)
let tokens = []
let diverged = false
for (let o = 32; o < source.length + 32; o += 32) {
    const slice = source.slice(0, Math.min(o, source.length))
    const r = parser.update(slice)
    tokens = r.canReuse ? reuseStableTokenArray(tokens, r.tokens, r.divergeAt) : r.tokens
    const fresh = lexAndClean(slice, options, false)
    const st = tokens.map((t) => t.type).join(',')
    const ft = fresh.map((t) => t.type).join(',')
    if (st !== ft) {
        diverged = true
        console.log(`first divergence at ${slice.length} bytes`)
        console.log('streamed:', st)
        console.log('fresh:   ', ft)
        tokens.forEach(
            (t, i) =>
                t.type === 'list' && console.log(`streamed[${i}] list raw:`, JSON.stringify(t.raw))
        )
        fresh.forEach(
            (t, i) =>
                t.type === 'list' && console.log(`fresh[${i}] list raw:   `, JSON.stringify(t.raw))
        )
        console.log(
            'previous slice tail:',
            JSON.stringify(source.slice(0, slice.length - 32).slice(-60))
        )
        break
    }
}
if (!diverged)
    console.log(
        `no divergence: streamed and fresh top-level shapes match at every 32-byte step (${source.length} bytes)`
    )
