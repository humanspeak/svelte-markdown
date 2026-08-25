import type { SvelteMarkdownOptions } from '$lib/types.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'

/**
 * Red test for the broken home-page streaming demo (FIG-002).
 *
 * The demo streams word chunks (regex `\S+` plus trailing whitespace)
 * append-only through `writeChunk`. Its content includes a fenced code block that contains a
 * blank line:
 *
 * ```javascript
 * import { writable } from 'svelte/store'
 *                                          <-- blank line inside the fence
 * const count = writable(0)
 * ...
 * ```
 *
 * When a flush lands right after that blank line, the lexer sees an
 * unclosed fence whose `raw` ends with `\n\n`. The tail-window boundary
 * then treats the half-open code token as a stable prefix token, freezes
 * it, and lexes everything streamed afterwards in isolation — so the rest
 * of the code block renders as a paragraph and the closing fence becomes
 * a stray empty code block.
 *
 * The invariant under test: after any append-only update sequence, the
 * final token array must match a fresh full parse of the same source.
 */
describe('IncrementalParser streaming across a fenced code block with a blank line', () => {
    // Fresh options per use — cross-test pollution guarded by
    // incremental-parser.options-pollution.test.ts.
    const createOptions = (): SvelteMarkdownOptions => ({ gfm: true })

    it('keeps an unclosed fence open when the stream pauses on a blank line inside it', () => {
        const options = createOptions()
        const parser = new IncrementalParser(options)

        // Stream pauses exactly after the blank line inside the open fence —
        // the word-chunk regex glues `\n\n` onto the preceding word, so this
        // boundary occurs on the home page on every run.
        parser.update("```javascript\nimport { writable } from 'svelte/store'\n\n")

        const full =
            "```javascript\nimport { writable } from 'svelte/store'\n\nconst count = writable(0)\n```\n"
        const result = parser.update(full)

        const expected = lexAndClean(full, createOptions(), false)
        expect(result.tokens.map((t) => t.type)).toEqual(expected.map((t) => t.type))
        expect(result.tokens.map((t) => t.raw)).toEqual(expected.map((t) => t.raw))
    })

    it('renders the home-page streaming demo content correctly after the final chunk', () => {
        // Exact content of the FIG-002 streaming demo on docs/src/routes/+page.svelte
        const streamContent = `# Understanding Reactive Systems

Reactive programming is a **declarative paradigm** concerned with _data streams_ and the propagation of change.

## Core Principles

1. **Observables** — represent a stream of data over time
2. **Operators** — transform, filter, and combine streams
3. **Subscribers** — consume the final output

> "The best way to predict the future is to invent it." — Alan Kay

### A Simple Example

\`\`\`javascript
import { writable } from 'svelte/store'

const count = writable(0)
count.subscribe(value => {
    console.log(\`Count: \${value}\`)
})
\`\`\`

| Feature | Svelte | React |
|---------|--------|-------|
| Reactivity | Compile-time | Runtime |
| Bundle Size | Small | Medium |

The \`writable\` store notifies all subscribers when the value changes. This makes building **real-time UIs** straightforward.`

        const parser = new IncrementalParser(createOptions())

        // Same chunking as the demo: word chunks with trailing whitespace,
        // applied append-only with a parse per flush.
        const chunks = streamContent.match(/\S+\s*/g) ?? []
        let accumulated = ''
        let lastTokens: ReturnType<typeof lexAndClean> = []
        for (const chunk of chunks) {
            accumulated += chunk
            lastTokens = parser.update(accumulated).tokens
        }

        expect(accumulated).toBe(streamContent)

        const expected = lexAndClean(streamContent, createOptions(), false)
        expect(lastTokens.map((t) => t.type)).toEqual(expected.map((t) => t.type))

        // The fenced block must survive as ONE code token containing the
        // full snippet — not get split at the blank line.
        const codeTokens = lastTokens.filter((t) => t.type === 'code')
        expect(codeTokens).toHaveLength(1)
        expect((codeTokens[0] as { text?: string }).text).toContain('count.subscribe')
    })
})
