/**
 * Component-level regression coverage for issue #291.
 *
 * Mirrors the unit tests in `utils/incremental-parser.nested-html.test.ts`
 * but drives `<SvelteMarkdown streaming={true} />` end-to-end via the
 * imperative `writeChunk()` API. The unit tests prove the bug is in
 * `IncrementalParser`; these tests prove the resulting broken token tree
 * propagates all the way to the rendered DOM through the component's
 * dispatch + streaming-diff layer.
 *
 * The strongest assertion in this file is the "streaming DOM equals
 * non-streaming DOM" comparison: it pins behavioral equivalence between
 * the two rendering modes, regardless of which layer is responsible for
 * any divergence.
 *
 * https://github.com/humanspeak/svelte-markdown/issues/291
 */

import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import { tokenCache } from './utils/token-cache.js'

beforeEach(() => {
    tokenCache.clearAllTokens()
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

const flushStreamingBatch = async () => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(50)
    })
}

const NESTED = `<div style="background: #1e293b">
<strong>Verdict:</strong> ship it
<ul>
<li>URL allowlist covers all dangerous protocols</li>
<li>Event handlers stripped</li>
<li>Streaming-aware</li>
</ul>
</div>`

const DIV_STRONG_ONLY = `<div style="background: #1e293b">
<strong>Verdict:</strong> ship it
</div>`

const DIV_UL_ONLY = `<div>
<ul>
<li>one</li>
<li>two</li>
<li>three</li>
</ul>
</div>`

const DIV_TABLE = `<div>
<table>
<tr><th>k</th><th>v</th></tr>
<tr><td>a</td><td>1</td></tr>
</table>
</div>`

/**
 * Normalize a container's innerHTML for comparison: strip Svelte
 * reactivity comments and collapse whitespace runs. The DOM structure
 * itself is what we care about, not whitespace formatting.
 */
const normalizeHtml = (html: string): string =>
    html
        .replace(/<!--[^>]*-->/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim()

/**
 * Stream `source` through a freshly-rendered streaming component
 * one word-sized chunk at a time. Flushes the streaming RAF batch
 * BETWEEN each chunk — without this, all writes coalesce into a
 * single parser update at the end, which is effectively a
 * single-shot parse and doesn't exercise the incremental path.
 */
const renderStreamed = async (source: string) => {
    const harness = render(SvelteMarkdown, {
        props: { source: '', streaming: true }
    })
    const chunks = source.match(/\S+\s*/g) ?? []
    for (const chunk of chunks) {
        await act(() => harness.component.writeChunk(chunk))
        await flushStreamingBatch()
    }
    return harness.container
}

const renderStatic = async (source: string) => {
    const harness = render(SvelteMarkdown, { props: { source } })
    await act(async () => {
        await vi.advanceTimersByTimeAsync(20)
    })
    return harness.container
}

describe('SvelteMarkdown streaming — nested HTML (regression #291)', () => {
    describe('streamed DOM should match non-streamed DOM', () => {
        const cases: Array<{ name: string; source: string }> = [
            { name: 'div with strong only', source: DIV_STRONG_ONLY },
            { name: 'div with ul/li only', source: DIV_UL_ONLY },
            { name: 'div with strong + ul/li (primary)', source: NESTED },
            { name: 'div with nested table', source: DIV_TABLE }
        ]

        for (const { name, source } of cases) {
            test(name, async () => {
                const staticContainer = await renderStatic(source)
                const streamedContainer = await renderStreamed(source)

                const staticHtml = normalizeHtml(staticContainer.innerHTML)
                const streamedHtml = normalizeHtml(streamedContainer.innerHTML)

                expect(streamedHtml).toBe(staticHtml)
            })
        }
    })

    describe('details with blank-line-separated children (#291 follow-up)', () => {
        const DETAILS_WITH_PAYLOADS = `<details>
<summary>Show payloads</summary>

Look at this:

<a href="https://example.com">Real link</a>

<img src="x" alt="img"/>

<form><input type="text"/></form>

</details>`

        test('streamed <details> contains <summary> as a child, not as a sibling', async () => {
            const container = await renderStreamed(DETAILS_WITH_PAYLOADS)
            const details = container.querySelector('details')
            expect(details).not.toBeNull()
            expect(details!.querySelector('summary')).not.toBeNull()
            const orphanSummaries = Array.from(container.querySelectorAll('summary')).filter(
                (s) => s.closest('details') === null
            )
            expect(orphanSummaries).toEqual([])
        })

        test('streamed <details> swallows all inter-content as descendants', async () => {
            const container = await renderStreamed(DETAILS_WITH_PAYLOADS)
            const details = container.querySelector('details')
            expect(details!.querySelector('a')).not.toBeNull()
            expect(details!.querySelector('img')).not.toBeNull()
            expect(details!.querySelector('form')).not.toBeNull()
        })

        test('streamed DOM matches non-streamed DOM for details + payloads', async () => {
            const staticContainer = await renderStatic(DETAILS_WITH_PAYLOADS)
            const streamedContainer = await renderStreamed(DETAILS_WITH_PAYLOADS)
            expect(normalizeHtml(streamedContainer.innerHTML)).toBe(
                normalizeHtml(staticContainer.innerHTML)
            )
        })
    })

    describe('structural invariants on the rendered DOM for the primary reproducer', () => {
        test('streamed <div> is not empty — has at least one child element', async () => {
            const container = await renderStreamed(NESTED)
            const div = container.querySelector('div[style*="background"]') as HTMLElement | null
            expect(div).not.toBeNull()
            expect(div!.children.length).toBeGreaterThan(0)
        })

        test('streamed DOM has exactly one styled <div>', async () => {
            const container = await renderStreamed(NESTED)
            const divs = container.querySelectorAll('div[style*="background"]')
            expect(divs.length).toBe(1)
        })

        test('streamed DOM contains a single <ul> with three <li> children, all inside the <div>', async () => {
            const container = await renderStreamed(NESTED)
            const div = container.querySelector('div[style*="background"]') as HTMLElement | null
            expect(div).not.toBeNull()
            const uls = div!.querySelectorAll('ul')
            expect(uls.length).toBe(1)
            const lis = uls[0].querySelectorAll('li')
            expect(lis.length).toBe(3)
        })

        test('streamed DOM has no orphan <li> outside any <ul>', async () => {
            const container = await renderStreamed(NESTED)
            const orphans = Array.from(container.querySelectorAll('li')).filter(
                (li) => li.closest('ul') === null
            )
            expect(orphans).toEqual([])
        })

        test('streamed DOM does not duplicate list-item text', async () => {
            const container = await renderStreamed(NESTED)
            const occurrences = (container.textContent ?? '').match(/Event handlers stripped/g)
            expect(occurrences?.length ?? 0).toBe(1)
        })

        test('non-streamed render of the same source passes the same invariants (sanity)', async () => {
            const container = await renderStatic(NESTED)
            const div = container.querySelector('div[style*="background"]') as HTMLElement | null
            expect(div).not.toBeNull()
            expect(div!.children.length).toBeGreaterThan(0)
            const uls = div!.querySelectorAll('ul')
            expect(uls.length).toBe(1)
            expect(uls[0].querySelectorAll('li').length).toBe(3)
        })
    })
})
