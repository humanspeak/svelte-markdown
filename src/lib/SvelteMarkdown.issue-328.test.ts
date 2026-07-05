/**
 * Regression coverage for issue #328.
 *
 * Streaming reparses should not let generated heading ids drift, and token
 * splits should not remount downstream DOM nodes whose source position stayed
 * stable.
 *
 * https://github.com/humanspeak/svelte-markdown/issues/328
 */

import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import TrackedListItem from './test/issues/issue-328/TrackedListItem.svelte'
import TrackedParagraph from './test/issues/issue-328/TrackedParagraph.svelte'
import type { SvelteMarkdownProps } from './types.js'
import type { Renderers, Token } from './utils/markdown-parser.js'
import { tokenCache } from './utils/token-cache.js'

beforeEach(() => {
    tokenCache.clearAllTokens()
    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
        return setTimeout(() => callback(performance.now()), 16) as unknown as number
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

const headingIds = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'), (heading) => heading.id)

const renderStaticHeadingIds = async (source: string) => {
    const { container } = render(SvelteMarkdown, {
        props: { source }
    })
    await flushStreamingBatch()

    return headingIds(container)
}

const renderChunkedHeadingIds = async (chunks: string[]) => {
    const { component, container } = render(SvelteMarkdown, {
        props: { source: '', streaming: true }
    })

    for (const chunk of chunks) {
        await act(() => component.writeChunk(chunk))
        await flushStreamingBatch()
    }

    return headingIds(container)
}

const textToken = (text: string): Token =>
    ({
        type: 'text',
        raw: text,
        text
    }) as Token

const listItemToken = (text: string): Token =>
    ({
        type: 'list_item',
        raw: `- ${text}`,
        text,
        tokens: [textToken(text)]
    }) as Token

const listToken = (items: Token[]): Token =>
    ({
        type: 'list',
        raw: items.map((item) => item.raw).join('\n'),
        ordered: false,
        start: 1,
        loose: false,
        items
    }) as unknown as Token

const tableCell = (text: string) => ({
    text,
    tokens: [textToken(text)]
})

const tableToken = (rows: Array<Array<ReturnType<typeof tableCell>>>): Token =>
    ({
        type: 'table',
        raw: '',
        align: [null, null],
        header: [tableCell('Label'), tableCell('Value')],
        rows
    }) as unknown as Token

const findBodyRow = (container: HTMLElement, text: string) =>
    Array.from(container.querySelectorAll('tbody tr')).find((row) => row.textContent === text)

describe('SvelteMarkdown streaming stability (issue #328)', () => {
    test('keeps generated heading ids stable after a full streaming reparse', async () => {
        const initialSource = '# Intro\n\nSee [docs][ref]'
        const nextSource = `${initialSource}\n\n[ref]: https://example.com`

        const { container, rerender } = render(SvelteMarkdown, {
            props: {
                source: initialSource,
                streaming: true
            }
        })
        await flushStreamingBatch()

        expect(container.querySelector('h1')).toHaveAttribute('id', 'intro')

        await rerender({
            source: nextSource,
            streaming: true
        })
        await flushStreamingBatch()

        expect(container.querySelector('h1')).toHaveAttribute('id', 'intro')
    })

    test('generates the same final heading ids regardless of streaming chunk boundaries', async () => {
        const finalSource = '# Intro\n\nSee [docs][ref]\n\n[ref]: https://example.com'
        const initialChunk = '# Intro\n\nSee [docs][ref]'
        const referenceChunk = '\n\n[ref]: https://example.com'

        const staticIds = await renderStaticHeadingIds(finalSource)
        const singleFlushIds = await renderChunkedHeadingIds([finalSource])
        const splitFlushIds = await renderChunkedHeadingIds([initialChunk, referenceChunk])

        expect(staticIds).toEqual(['intro'])
        expect(singleFlushIds).toEqual(staticIds)
        expect(splitFlushIds).toEqual(staticIds)
    })

    test('keeps duplicate heading dedupe stable after a streaming reparse', async () => {
        const initialSource = '# Intro\n\n# Intro\n\nSee [docs][ref]'
        const nextSource = `${initialSource}\n\n[ref]: https://example.com`

        const { container, rerender } = render(SvelteMarkdown, {
            props: {
                source: initialSource,
                streaming: true
            }
        })
        await flushStreamingBatch()

        expect(headingIds(container)).toEqual(['intro', 'intro-1'])

        await rerender({
            source: nextSource,
            streaming: true
        })
        await flushStreamingBatch()

        expect(headingIds(container)).toEqual(['intro', 'intro-1'])
    })

    test('keeps a downstream paragraph mounted when an earlier token split preserves its source offset', async () => {
        const initialSource = 'Intro\n-  \n\nMore'
        const nextSource = 'Intro\n- T\n\nMore'
        const editOffset = 'Intro\n- '.length
        const mounted: Array<{ text: string | undefined; element: HTMLParagraphElement }> = []
        const destroyed: Array<{ text: string | undefined; element: HTMLParagraphElement }> = []

        expect(initialSource.indexOf('More')).toBe(nextSource.indexOf('More'))

        const props = {
            source: '',
            streaming: true,
            renderers: {
                paragraph: TrackedParagraph
            } satisfies Partial<Renderers>,
            onParagraphMount: (text: string | undefined, element: HTMLParagraphElement) => {
                mounted.push({ text, element })
            },
            onParagraphDestroy: (text: string | undefined, element: HTMLParagraphElement) => {
                destroyed.push({ text, element })
            }
        } satisfies SvelteMarkdownProps & {
            onParagraphMount: (text: string | undefined, element: HTMLParagraphElement) => void
            onParagraphDestroy: (text: string | undefined, element: HTMLParagraphElement) => void
        }

        const { component, container } = render(SvelteMarkdown, { props })

        await act(() => component.resetStream(initialSource))
        expect(container.querySelector('h2')?.textContent).toBe('Intro')

        const tailBefore = container.querySelector('[data-tracked-paragraph="More"]')
        expect(tailBefore).toBeInstanceOf(HTMLParagraphElement)
        expect(mounted.filter((entry) => entry.text === 'More')).toHaveLength(1)

        await act(() => component.writeChunk({ value: 'T', offset: editOffset }))

        const tailAfter = container.querySelector('[data-tracked-paragraph="More"]')
        expect(container.querySelector('ul li')?.textContent).toBe('T')
        expect(tailAfter).toBe(tailBefore)
        expect(destroyed.some((entry) => entry.text === 'More')).toBe(false)
        expect(mounted.filter((entry) => entry.text === 'More')).toHaveLength(1)
    })

    test('keeps a stable list item mounted when a sibling is inserted before it', async () => {
        const stableItem = listItemToken('More')
        const insertedItem = listItemToken('Inserted')

        const props = {
            source: [listToken([stableItem])],
            renderers: {
                listitem: TrackedListItem
            } satisfies Partial<Renderers>
        } satisfies SvelteMarkdownProps

        const { container, rerender } = render(SvelteMarkdown, { props })
        const itemBefore = container.querySelector('[data-tracked-list-item="More"]')

        expect(itemBefore).toBeInstanceOf(HTMLLIElement)

        await rerender({
            ...props,
            source: [listToken([insertedItem, stableItem])]
        })

        const itemAfter = container.querySelector('[data-tracked-list-item="More"]')
        expect(container.querySelector('li')?.textContent).toBe('Inserted')
        expect(itemAfter).toBe(itemBefore)
    })

    test('keeps a stable table body row mounted when a sibling row is inserted before it', async () => {
        const stableRow = [tableCell('More'), tableCell('Tail')]
        const insertedRow = [tableCell('Inserted'), tableCell('Row')]
        const { container, rerender } = render(SvelteMarkdown, {
            props: {
                source: [tableToken([stableRow])]
            }
        })

        const rowBefore = findBodyRow(container, 'MoreTail')
        expect(rowBefore).toBeInstanceOf(HTMLTableRowElement)

        await rerender({
            source: [tableToken([insertedRow, stableRow])]
        })

        const rowAfter = findBodyRow(container, 'MoreTail')
        expect(findBodyRow(container, 'InsertedRow')).toBeInstanceOf(HTMLTableRowElement)
        expect(rowAfter).toBe(rowBefore)
    })
})
