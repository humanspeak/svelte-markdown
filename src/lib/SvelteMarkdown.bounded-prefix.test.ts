/**
 * Plan 011 — bounded per-update work on a long streamed document.
 *
 * Covers the per-update counters (`__svmStreamStats`: divergence-scan
 * comparisons, root-array copies, keyed-each key evaluations), the `parsed`
 * callback contract, and the root-segment rendering: every root keeps a single
 * `{#each}` owner for its whole life, heading ids match a one-shot render
 * across segment boundaries, and resets/option changes re-render correctly.
 */

import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import { describe, expect, test } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import TrackedParagraph from './test/issues/issue-328/TrackedParagraph.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'
import type { SvelteMarkdownProps } from './types.js'
import type { Renderers, Token, TokensList } from './utils/markdown-parser.js'
import { ROOT_SEGMENT_SPAN } from './utils/render-metadata.js'
import type { StreamStats } from './utils/streaming-token-reuse.js'

useStreamingTestHarness()

/** These suites mount documents of hundreds of roots; coverage runs are slow. */
const HEAVY_TIMEOUT = 60_000

type StatsGlobal = typeof globalThis & { __svmStreamStats?: StreamStats }

const resetStats = (): StreamStats => {
    const stats = { comparedRoots: 0, copiedRoots: 0, keyEvaluations: 0 }
    ;(globalThis as StatsGlobal).__svmStreamStats = stats
    return stats
}

const readStats = (): StreamStats => ({
    comparedRoots: 0,
    copiedRoots: 0,
    keyEvaluations: 0,
    ...(globalThis as StatsGlobal).__svmStreamStats
})

/** `count` closed paragraphs (2 roots each: paragraph + blank line). */
const closedParagraphs = (count: number, label = 'Closed'): string =>
    Array.from(
        { length: count },
        (_, index) =>
            `${label} paragraph ${index} with **bold**, *emphasis* and a [link](https://example.com/${index}).\n\n`
    ).join('')

const chunk = (source: string, size: number): string[] => {
    const chunks: string[] = []
    for (let index = 0; index < source.length; index += size) {
        chunks.push(source.slice(index, index + size))
    }
    return chunks
}

/** Streams `prefix` as one prop update, then `tail` as cumulative 32-char prop updates. */
const streamTailAsProps = async (prefix: string, tail: string, perUpdate: () => void) => {
    const { container, rerender } = render(SvelteMarkdown, {
        props: { source: prefix, streaming: true }
    })
    await flushStreamingBatch()
    for (let offset = 32; offset < tail.length + 32; offset += 32) {
        resetStats()
        await rerender({ source: prefix + tail.slice(0, offset), streaming: true })
        await flushStreamingBatch()
        perUpdate()
    }
    return container
}

const TAIL =
    'Streaming tail paragraph with **bold** and `code` that keeps growing across updates.\n\nA second tail paragraph arrives.\n\n'

describe('bounded per-update streaming work (plan 011)', () => {
    test(
        'the divergence scan compares only the re-lexed tail, whatever the prefix size',
        async () => {
            for (const paragraphs of [20, 200]) {
                const perUpdate: number[] = []
                await streamTailAsProps(closedParagraphs(paragraphs), TAIL, () =>
                    perUpdate.push(readStats().comparedRoots)
                )
                // Tail-window updates re-lex at most the last two roots; before plan
                // 011 this was ~2 × paragraphs per update.
                expect(Math.max(...perUpdate)).toBeLessThanOrEqual(4)
            }
        },
        HEAVY_TIMEOUT
    )

    test(
        'root tokens are copied at most once per update',
        async () => {
            const paragraphs = 200
            const roots = paragraphs * 2
            const perUpdate: number[] = []
            await streamTailAsProps(closedParagraphs(paragraphs), TAIL, () =>
                perUpdate.push(readStats().copiedRoots)
            )
            // One copy of the root array (the parser's reused prefix + the tail);
            // before plan 011 the component copied it a second time.
            expect(Math.max(...perUpdate)).toBeLessThanOrEqual(roots + 8)
        },
        HEAVY_TIMEOUT
    )

    test(
        'keyed-each key evaluations per update do not grow with the prefix',
        async () => {
            const maxKeysPerUpdate = async (paragraphs: number) => {
                const perUpdate: number[] = []
                await streamTailAsProps(closedParagraphs(paragraphs), TAIL, () =>
                    perUpdate.push(readStats().keyEvaluations)
                )
                return Math.max(...perUpdate)
            }
            const small = await maxKeysPerUpdate(20)
            const large = await maxKeysPerUpdate(300)
            // 300 paragraphs = 600 roots over ~8 root segments. Only the segment
            // being streamed into is re-diffed, so the large document costs about
            // what a one-segment document does — not 20× more.
            expect(large).toBeLessThanOrEqual(small * 2 + 50)
        },
        HEAVY_TIMEOUT
    )

    test(
        'a supplied parsed callback still receives the full token array every update',
        async () => {
            const received: Array<Token[] | TokensList> = []
            const prefix = closedParagraphs(10)
            const { rerender } = render(SvelteMarkdown, {
                props: {
                    source: prefix,
                    streaming: true,
                    parsed: (tokens) => received.push(tokens)
                }
            })
            await flushStreamingBatch()
            const next = `${prefix}Tail paragraph`
            received.length = 0
            await rerender({
                source: next,
                streaming: true,
                parsed: (tokens: Token[] | TokensList) => received.push(tokens)
            })
            await flushStreamingBatch()

            expect(received.length).toBeGreaterThan(0)
            const last = received.at(-1) ?? []
            expect(last).toHaveLength(21)
            expect(last.at(-1)?.raw).toBe('Tail paragraph')
        },
        HEAVY_TIMEOUT
    )

    test(
        'renders without a parsed callback',
        async () => {
            const { container } = render(SvelteMarkdown, {
                props: { source: '# Title\n\nBody', streaming: true }
            })
            await flushStreamingBatch()
            expect(container.querySelector('h1')?.textContent).toBe('Title')
            expect(container.querySelector('p')?.textContent).toBe('Body')
        },
        HEAVY_TIMEOUT
    )
})

describe('root segments keep one owner per block (plan 011)', () => {
    type Lifecycle = { text: string | undefined; element: HTMLParagraphElement }

    const trackedProps = (mounted: Lifecycle[], destroyed: Lifecycle[]) =>
        ({
            source: '',
            streaming: true,
            renderers: { paragraph: TrackedParagraph } satisfies Partial<Renderers>,
            onParagraphMount: (text: string | undefined, element: HTMLParagraphElement) => {
                mounted.push({ text, element })
            },
            onParagraphDestroy: (text: string | undefined, element: HTMLParagraphElement) => {
                destroyed.push({ text, element })
            }
        }) satisfies SvelteMarkdownProps & Record<string, unknown>

    test(
        'a paragraph streamed open, then closed, then followed by 100 appends is mounted exactly once',
        async () => {
            const mounted: Lifecycle[] = []
            const destroyed: Lifecycle[] = []
            const { component, container } = render(SvelteMarkdown, {
                props: trackedProps(mounted, destroyed)
            })

            // A closed prefix that ends just before a segment boundary, so the
            // tracked paragraph starts in one segment and the appends after it
            // fill later ones.
            let prefix = closedParagraphs(40)
            while (prefix.length < ROOT_SEGMENT_SPAN - 60) prefix += 'Filler.\n\n'
            await act(() => component.writeChunk(prefix))
            await flushStreamingBatch()

            const tracked =
                'Tracked paragraph streams in open, word by word, until it finally closes.'
            for (const piece of chunk(tracked, 7)) {
                await act(() => component.writeChunk(piece))
                await flushStreamingBatch()
            }
            await act(() => component.writeChunk('\n\n'))
            await flushStreamingBatch()

            const trackedElement = container.querySelector('[data-tracked-paragraph^="Tracked"]')
            expect(trackedElement).toBeInstanceOf(HTMLParagraphElement)

            for (let index = 0; index < 100; index++) {
                await act(() =>
                    component.writeChunk(`Appended paragraph ${index} after the tracked one.\n\n`)
                )
                await flushStreamingBatch()
            }

            const fullSource = `${prefix}${tracked}\n\n${Array.from(
                { length: 100 },
                (_, index) => `Appended paragraph ${index} after the tracked one.\n\n`
            ).join('')}`
            // The appends crossed at least one more segment boundary.
            expect(fullSource.length).toBeGreaterThan(prefix.length + ROOT_SEGMENT_SPAN)

            const trackedMounts = mounted.filter((entry) => entry.element === trackedElement)
            expect(trackedMounts).toHaveLength(1)
            expect(destroyed.filter((entry) => entry.element === trackedElement)).toHaveLength(0)
            expect(container.querySelector('[data-tracked-paragraph^="Tracked"]')).toBe(
                trackedElement
            )
            // Each paragraph was mounted once in total: nothing remounted.
            const paragraphCount = container.querySelectorAll('p').length
            expect(destroyed).toHaveLength(mounted.length - paragraphCount)

            const { container: fresh } = render(SvelteMarkdown, {
                props: { ...trackedProps([], []), source: fullSource, streaming: false }
            })
            expect(container.innerHTML).toBe(fresh.innerHTML)
        },
        HEAVY_TIMEOUT
    )

    test(
        'duplicate headings across segment boundaries get the one-shot ids',
        async () => {
            const filler = closedParagraphs(55)
            expect(filler.length).toBeGreaterThan(ROOT_SEGMENT_SPAN)
            const source = `# Intro\n\n${filler}# Intro\n\n${filler}# Intro\n\nDone.`

            const { component, container } = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            for (const piece of chunk(source, 32)) {
                await act(() => component.writeChunk(piece))
                await flushStreamingBatch()
            }
            const ids = Array.from(container.querySelectorAll('h1'), (heading) => heading.id)
            expect(ids).toEqual(['intro', 'intro-1', 'intro-2'])

            const { container: fresh } = render(SvelteMarkdown, { props: { source } })
            expect(Array.from(fresh.querySelectorAll('h1'), (heading) => heading.id)).toEqual(ids)
            expect(container.innerHTML).toBe(fresh.innerHTML)
        },
        HEAVY_TIMEOUT
    )

    test(
        'resetStream and an options change re-render a multi-segment document correctly',
        async () => {
            const first = `# Intro\n\n${closedParagraphs(60, 'First')}# Intro\n\nEnd one.`
            const second = `# Other\n\n${closedParagraphs(70, 'Second')}# Other\n\nEnd two.`
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            for (const piece of chunk(first, 256)) {
                await act(() => component.writeChunk(piece))
                await flushStreamingBatch()
            }

            await act(() => component.resetStream(second))
            await flushStreamingBatch()
            const { container: fresh } = render(SvelteMarkdown, { props: { source: second } })
            expect(container.innerHTML).toBe(fresh.innerHTML)
            expect(container.textContent).not.toContain('First paragraph')

            await rerender({ source: '', streaming: true, options: { headerPrefix: 'doc-' } })
            await flushStreamingBatch()
            const { container: prefixed } = render(SvelteMarkdown, {
                props: { source: second, options: { headerPrefix: 'doc-' } }
            })
            expect(Array.from(container.querySelectorAll('h1'), (heading) => heading.id)).toEqual([
                'doc-other',
                'doc-other-1'
            ])
            expect(container.innerHTML).toBe(prefixed.innerHTML)
        },
        HEAVY_TIMEOUT
    )

    test(
        'an edit and an append applied before one render re-prepare from the edit',
        async () => {
            const { component, container } = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            const base = closedParagraphs(120)
            expect(base.length).toBeGreaterThan(2 * ROOT_SEGMENT_SPAN)
            await act(() => component.resetStream(base))
            await flushStreamingBatch()

            // Offset chunks apply immediately. The first rewrites the first
            // paragraph (not an append: every root is new, metadata from 0); the
            // second appends (divergence near the end). Both land before Svelte
            // renders, so metadata must restart at 0 — keeping the segments
            // before the append's divergence point would render the old text.
            const edited = `Edited${base.slice('Closed'.length)}`
            const appended = 'A final appended paragraph.'
            await act(() => {
                component.writeChunk({ value: 'Edited', offset: 0 })
                component.writeChunk({ value: appended, offset: edited.length })
            })
            await flushStreamingBatch()

            expect(container.querySelector('p')?.textContent).toMatch(/^Edited paragraph 0/)
            const { container: fresh } = render(SvelteMarkdown, {
                props: { source: edited + appended }
            })
            expect(container.innerHTML).toBe(fresh.innerHTML)
        },
        HEAVY_TIMEOUT
    )

    test(
        'two updates applied before one render keep every changed root current',
        async () => {
            const { component, container } = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })
            const base = `${closedParagraphs(60)}Open paragraph`
            await act(() => component.writeChunk(base))
            await flushStreamingBatch()

            // Each chunk is ≥ the batch threshold, so each is parsed immediately;
            // both land before Svelte renders. The first grows the open paragraph
            // (diverging at its index); the second closes it and appends a new
            // one (diverging right after it — exactly the previously prepared
            // length). Metadata must restart at the EARLIER divergence point, or
            // the grown paragraph is rendered from the stale segment.
            const first = ` grows ${'z'.repeat(260)}`
            const second = `\n\nA final paragraph ${'y'.repeat(260)}`
            await act(() => {
                component.writeChunk(first)
                component.writeChunk(second)
            })
            await flushStreamingBatch()

            const { container: fresh } = render(SvelteMarkdown, {
                props: { source: base + first + second }
            })
            expect(container.innerHTML).toBe(fresh.innerHTML)
        },
        HEAVY_TIMEOUT
    )
})
