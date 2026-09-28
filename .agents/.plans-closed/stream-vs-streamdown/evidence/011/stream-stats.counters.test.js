/**
 * Plan 011 Step 1 harness: per-update dev-only counters (`__svmStreamStats`)
 * for the stream-compare `prefix-*` and `large-closed-block` scenarios.
 * Corpora and chunking are copied verbatim from
 * `src/routes/test/stream-compare/+page.svelte` (32 chars per update, prop
 * input, closed prefix mounted first and not counted).
 *
 * Writes `counters-<label>.json` next to this file (label from
 * `SVM_COUNTERS_LABEL`, default `run`).
 */
import { render } from '@testing-library/svelte'
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from 'vitest'
import SvelteMarkdown from '../../../../../src/lib/SvelteMarkdown.svelte'
import {
    flushStreamingBatch,
    useStreamingTestHarness
} from '../../../../../src/lib/test/streaming/harness.js'

useStreamingTestHarness()

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

const makeProseMixed = (targetBytes) => {
    let source = '# Long streaming benchmark\n\n'
    let index = 0
    while (source.length < targetBytes) source += section(index++)
    return source
}

const makeClosedParagraphs = (targetBytes) => {
    let source = ''
    let index = 0
    while (source.length < targetBytes) {
        source += `### Note ${index}\n\nClosed paragraph ${index} with **bold**, *emphasis*, \`code\`, and a [link](https://example.com/prefix/${index}).\n\n`
        index++
    }
    return source
}

const makeClosedNestedList = (targetBytes) => {
    let source = ''
    let index = 0
    while (source.length < targetBytes) {
        source += `- Item ${index} with **bold** text\n  - Nested ${index}.a with \`code\`\n  - Nested ${index}.b with a [link](https://example.com/list/${index})\n`
        index++
    }
    return `${source}\n`
}

const scenarios = [
    { id: 'prefix-24kb', prefix: () => makeClosedParagraphs(24_000) },
    { id: 'prefix-96kb', prefix: () => makeClosedParagraphs(96_000) },
    { id: 'prefix-384kb', prefix: () => makeClosedParagraphs(384_000) },
    { id: 'large-closed-block', prefix: () => makeClosedNestedList(20_000) }
]

const results = {}

for (const scenario of scenarios) {
    test(`counters ${scenario.id}`, async () => {
        const prefix = scenario.prefix()
        const source = prefix + makeProseMixed(2_000)
        const slices = []
        for (let offset = prefix.length + 32; offset < source.length; offset += 32) {
            slices.push(source.slice(0, offset))
        }
        slices.push(source)

        const { rerender, container } = render(SvelteMarkdown, {
            props: { source: prefix, streaming: true }
        })
        await flushStreamingBatch()

        const g = globalThis
        const frames = []
        for (const slice of slices) {
            g.__svmStreamStats = { comparedRoots: 0, copiedRoots: 0, keyEvaluations: 0 }
            await rerender({ source: slice, streaming: true })
            await flushStreamingBatch()
            frames.push({ ...g.__svmStreamStats })
        }
        expect(container.textContent).toContain('Section')

        const mean = (key) =>
            Math.round(
                (frames.reduce((total, frame) => total + frame[key], 0) / frames.length) * 10
            ) / 10
        const max = (key) => Math.max(...frames.map((frame) => frame[key]))
        const summary = {
            prefixBytes: prefix.length,
            frames: frames.length,
            meanPerFrame: {
                comparedRoots: mean('comparedRoots'),
                copiedRoots: mean('copiedRoots'),
                keyEvaluations: mean('keyEvaluations')
            },
            maxPerFrame: {
                comparedRoots: max('comparedRoots'),
                copiedRoots: max('copiedRoots'),
                keyEvaluations: max('keyEvaluations')
            }
        }
        results[scenario.id] = summary
        console.log(scenario.id, JSON.stringify(summary))
        const label = process.env.SVM_COUNTERS_LABEL ?? 'run'
        writeFileSync(
            path.join(import.meta.dirname, `counters-${label}.json`),
            `${JSON.stringify(results, null, 2)}\n`
        )
    })
}
