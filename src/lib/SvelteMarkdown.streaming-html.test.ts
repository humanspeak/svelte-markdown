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
import { describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'

useStreamingTestHarness()

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
 * reactivity comments, drop auto-generated heading `id` attributes
 * (github-slugger's counter is stateful across renders so successive
 * renders of the same source get suffixed ids), and collapse
 * whitespace runs. The DOM structure itself is what we care about,
 * not whitespace formatting or slugger nondeterminism.
 */
const normalizeHtml = (html: string): string =>
    html
        .replace(/<!--[^>]*-->/g, '')
        .replace(/ id="[^"]*"/g, '')
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

    describe('streamed array truncation on token count shrink (#291 follow-up)', () => {
        // When a partial-state stream has, say, 10 top-level tokens and the
        // final closing </details> collapses them to 5, the leftover
        // indices must be removed from the rendered DOM. A naive
        // `tokens.length = N` after per-index assignment was leaving the
        // trailing snippets mounted in Svelte 5's reactive each block.
        const TABLE_PLUS_DETAILS = `### Findings

| File | Severity | Note |
|------|----------|------|
| \`Parser.svelte\` | info | First |
| \`sanitize.ts\` | info | Context-aware (per-tag policies possible) |

<details>
<summary>Show payloads</summary>

Look:

<a href="https://example.com">Real link</a>

</details>

That is everything.`

        test('streamed DOM has exactly one <summary>, no orphans after </details>', async () => {
            const container = await renderStreamed(TABLE_PLUS_DETAILS)
            expect(container.querySelectorAll('summary').length).toBe(1)
            const orphans = Array.from(container.querySelectorAll('summary')).filter(
                (s) => s.closest('details') === null
            )
            expect(orphans).toEqual([])
        })

        test('streamed DOM has exactly one <details>, no duplicates', async () => {
            const container = await renderStreamed(TABLE_PLUS_DETAILS)
            expect(container.querySelectorAll('details').length).toBe(1)
        })

        test('streamed DOM has exactly one each of the headings', async () => {
            const container = await renderStreamed(TABLE_PLUS_DETAILS)
            const headings = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent)
            expect(headings).toEqual(['Findings'])
        })

        test('streamed DOM does not leak raw table-cell text as a paragraph', async () => {
            const container = await renderStreamed(TABLE_PLUS_DETAILS)
            // Marked emits partial table rows as plain paragraphs while the
            // table is still streaming. Those intermediate paragraphs must
            // be removed once the full table is recognized.
            expect(container.innerHTML.includes('es possible) |')).toBe(false)
        })
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

    describe('resetStream() between sessions (#291 follow-up)', () => {
        // Chat UIs reset the stream between assistant turns. If a previous
        // session left `prevHasHtmlSpanMismatch` set on the parser, the
        // next session would incorrectly take the full-reparse path
        // forever, or worse, retain stale token state across resets.

        test('resetStream after an HTML-heavy stream clears the DOM', async () => {
            const harness = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            for (const c of NESTED.match(/\S+\s*/g) ?? []) {
                await act(() => harness.component.writeChunk(c))
                await flushStreamingBatch()
            }
            expect(harness.container.querySelector('ul')).not.toBeNull()

            await act(() => harness.component.resetStream())
            await flushStreamingBatch()

            expect(harness.container.querySelector('ul')).toBeNull()
            expect(harness.container.querySelector('div[style*="background"]')).toBeNull()
        })

        test('streaming new HTML after resetStream produces correct nested DOM', async () => {
            const harness = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            // First session: stream a div with ul/li
            for (const c of NESTED.match(/\S+\s*/g) ?? []) {
                await act(() => harness.component.writeChunk(c))
                await flushStreamingBatch()
            }
            await act(() => harness.component.resetStream())
            await flushStreamingBatch()

            // Second session: stream a totally different shape
            const NEXT = `<details>\n<summary>fresh title</summary>\n\n<p>fresh body</p>\n\n</details>`
            for (const c of NEXT.match(/\S+\s*/g) ?? []) {
                await act(() => harness.component.writeChunk(c))
                await flushStreamingBatch()
            }

            const details = harness.container.querySelector('details')
            expect(details).not.toBeNull()
            expect(details!.querySelector('summary')?.textContent).toBe('fresh title')
            // Previous session's tokens must not survive the reset
            expect(harness.container.querySelector('ul')).toBeNull()
            expect(harness.container.querySelector('div[style*="background"]')).toBeNull()
        })
    })

    describe('reactive source prop with streaming=true (#291 follow-up)', () => {
        // The other streaming ingress path: instead of imperative
        // writeChunk(), some apps mutate the `source` prop reactively as
        // chunks arrive. The component's `syncStreamingSourceFromProp`
        // routes those through the same applyStreamingSource pipeline,
        // so the same convergence guarantee must hold.

        test('mutating source prop in chunks produces correct nested DOM', async () => {
            const harness = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            const chunks = NESTED.match(/\S+\s*/g) ?? []
            let acc = ''
            for (const c of chunks) {
                acc += c
                await act(() => harness.rerender({ source: acc, streaming: true }))
                await flushStreamingBatch()
            }
            const div = harness.container.querySelector(
                'div[style*="background"]'
            ) as HTMLElement | null
            expect(div).not.toBeNull()
            expect(div!.querySelectorAll('li').length).toBe(3)
        })

        test('reactive-source streamed DOM equals writeChunk-streamed DOM', async () => {
            const SHORT = `<div>\n<strong>ship it</strong>\n<ul>\n<li>a</li>\n<li>b</li>\n</ul>\n</div>`

            const writeChunkHarness = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            for (const c of SHORT.match(/\S+\s*/g) ?? []) {
                await act(() => writeChunkHarness.component.writeChunk(c))
                await flushStreamingBatch()
            }

            const reactiveHarness = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            let acc = ''
            for (const c of SHORT.match(/\S+\s*/g) ?? []) {
                acc += c
                await act(() => reactiveHarness.rerender({ source: acc, streaming: true }))
                await flushStreamingBatch()
            }

            expect(normalizeHtml(reactiveHarness.container.innerHTML)).toBe(
                normalizeHtml(writeChunkHarness.container.innerHTML)
            )
        })
    })

    describe('offset-mode chunks (#291 follow-up)', () => {
        // writeChunk({ value, offset }) supports out-of-order websocket
        // delivery via overwrite-at-position semantics. The full source
        // converges regardless of arrival order, so the final DOM must
        // match in-order streaming once all offsets have been written.

        test('out-of-order offset writes converge to the same DOM as in-order chunks', async () => {
            const SOURCE = `<details><summary>title</summary><p>body content</p></details>`

            const inOrder = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            for (const c of SOURCE.match(/\S+\s*/g) ?? []) {
                await act(() => inOrder.component.writeChunk(c))
                await flushStreamingBatch()
            }

            const outOfOrder = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            // Write the second half first (overwrite at later offset),
            // then fill in the first half. Both halves are aligned with
            // the natural byte boundary in SOURCE.
            const splitAt = SOURCE.indexOf('<p>')
            const head = SOURCE.slice(0, splitAt)
            const tail = SOURCE.slice(splitAt)
            await act(() => outOfOrder.component.writeChunk({ value: tail, offset: splitAt }))
            await flushStreamingBatch()
            await act(() => outOfOrder.component.writeChunk({ value: head, offset: 0 }))
            await flushStreamingBatch()

            expect(normalizeHtml(outOfOrder.container.innerHTML)).toBe(
                normalizeHtml(inOrder.container.innerHTML)
            )
        })
    })

    describe('streaming with custom sanitizers (#291 follow-up)', () => {
        // Custom sanitizeUrl / sanitizeAttributes hooks must run on
        // every streamed token transition, not just the final one — a
        // bad URL emitted mid-stream must never reach the DOM.

        test('custom sanitizeUrl blocks bad URLs during streaming', async () => {
            const seen: string[] = []
            const sanitizeUrl = (url: string) => {
                if (url.startsWith('javascript:')) {
                    seen.push(url)
                    return ''
                }
                return url
            }

            const SRC = `<div>\n<a href="javascript:alert(1)">bad</a>\n<a href="https://example.com">good</a>\n</div>`

            const harness = render(SvelteMarkdown, {
                props: { source: '', streaming: true, sanitizeUrl }
            })
            for (const c of SRC.match(/\S+\s*/g) ?? []) {
                await act(() => harness.component.writeChunk(c))
                await flushStreamingBatch()
            }

            expect(seen).toContain('javascript:alert(1)')
            const links = Array.from(harness.container.querySelectorAll('a'))
            const bad = links.find((a) => a.textContent === 'bad')
            const good = links.find((a) => a.textContent === 'good')
            expect(bad?.getAttribute('href')).toBeFalsy()
            expect(good?.getAttribute('href')).toBe('https://example.com')
        })
    })

    describe('alternating html and markdown blocks (#291 follow-up)', () => {
        const ALTERNATING = `<div>HTML block 1</div>

# Markdown heading

<div>HTML block 2</div>

Paragraph between

<div>HTML block 3</div>`

        test('three sibling html blocks separated by markdown stream correctly', async () => {
            const container = await renderStreamed(ALTERNATING)
            const divs = container.querySelectorAll('div')
            // Filter only the agent-emitted html divs (not wrapper divs
            // the test environment may inject).
            const htmlBlocks = Array.from(divs).filter((d) =>
                d.textContent?.startsWith('HTML block')
            )
            expect(htmlBlocks.length).toBe(3)
            expect(htmlBlocks[0].textContent).toBe('HTML block 1')
            expect(htmlBlocks[1].textContent).toBe('HTML block 2')
            expect(htmlBlocks[2].textContent).toBe('HTML block 3')
            expect(container.querySelector('h1')?.textContent).toBe('Markdown heading')
        })

        test('alternating blocks streamed DOM equals non-streamed DOM', async () => {
            const staticDom = await renderStatic(ALTERNATING)
            const streamDom = await renderStreamed(ALTERNATING)
            expect(normalizeHtml(streamDom.innerHTML)).toBe(normalizeHtml(staticDom.innerHTML))
        })
    })
})
