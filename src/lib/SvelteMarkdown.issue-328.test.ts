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
import StableHeading from './test/issues/issue-328/StableHeading.svelte'
import TrackedListItem from './test/issues/issue-328/TrackedListItem.svelte'
import TrackedParagraph from './test/issues/issue-328/TrackedParagraph.svelte'
import type { SvelteMarkdownProps } from './types.js'
import type { Renderers, Token } from './utils/markdown-parser.js'
import { tokenCache } from './utils/token-cache.js'

type TestListItemToken = Token & { text?: string }

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

const headingTextsAndIds = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'), (heading) => ({
        text: heading.textContent,
        id: heading.id,
        inBlockquote: heading.closest('blockquote') !== null
    }))

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

const chunkSource = (source: string, chunkSize: number) => {
    const chunks: string[] = []

    for (let index = 0; index < source.length; index += chunkSize) {
        chunks.push(source.slice(index, index + chunkSize))
    }

    return chunks
}

const buildLargeHeadingSource = (sections: number) => {
    const out = ['# Intro\n\n']

    for (let index = 0; index < sections; index++) {
        out.push(`> # Intro\n\n`)
        out.push(`## Details\n\n`)
        out.push(`### Section ${index}\n\n`)
        out.push(`Paragraph ${index} with [link ${index}](https://example.com/${index}).\n\n`)

        if (index % 5 === 0) {
            out.push(`#### Details\n\n`)
        }
    }

    return out.join('')
}

const textToken = (text: string): Token =>
    ({
        type: 'text',
        raw: text,
        text
    }) as Token

const paragraphToken = (text: string, raw = text): Token =>
    ({
        type: 'paragraph',
        raw,
        text,
        tokens: [textToken(text)]
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

const lastParsedTokens = (parsed: ReturnType<typeof vi.fn>) =>
    parsed.mock.calls.at(-1)?.[0] as Token[] | undefined

const firstListToken = (tokens: Token[] | undefined) =>
    tokens?.find((token) => token.type === 'list') as
        (Token & { items: TestListItemToken[] }) | undefined

const firstTableToken = (tokens: Token[] | undefined) =>
    tokens?.find((token) => token.type === 'table') as
        (Token & { rows: Array<Array<ReturnType<typeof tableCell>>> }) | undefined

describe('SvelteMarkdown streaming stability (issue #328)', () => {
    test('renders adjacent top-level tokens with repeated zero-length spans without duplicate-key crashes', async () => {
        const tokens = [
            paragraphToken('Alpha'),
            { type: 'space', raw: '' } as Token,
            { type: 'space', raw: '' } as Token,
            paragraphToken('Beta'),
            { type: 'space', raw: '' } as Token,
            paragraphToken('Gamma')
        ]

        let container: HTMLElement | undefined

        expect(() => {
            ;({ container } = render(SvelteMarkdown, {
                props: {
                    source: tokens,
                    streaming: true
                }
            }))
        }).not.toThrow()

        expect(container?.textContent).toContain('Alpha')
        expect(container?.textContent).toContain('Beta')
        expect(container?.textContent).toContain('Gamma')
    })

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

    test('keeps headerPrefix on precomputed heading ids across a streaming reparse', async () => {
        const initialSource = '# Intro\n\nSee [docs][ref]'
        const nextSource = `${initialSource}\n\n[ref]: https://example.com`

        const { container, rerender } = render(SvelteMarkdown, {
            props: {
                source: initialSource,
                streaming: true,
                options: {
                    headerPrefix: 'user-content-'
                }
            }
        })
        await flushStreamingBatch()

        expect(container.querySelector('h1')).toHaveAttribute('id', 'user-content-intro')

        await rerender({
            source: nextSource,
            streaming: true,
            options: {
                headerPrefix: 'user-content-'
            }
        })
        await flushStreamingBatch()

        expect(container.querySelector('h1')).toHaveAttribute('id', 'user-content-intro')
    })

    test('passes stable precomputed ids to custom heading renderers during streaming reparses', async () => {
        const initialSource = '# Intro\n\nSee [docs][ref]'
        const nextSource = `${initialSource}\n\n[ref]: https://example.com`

        const { container, rerender } = render(SvelteMarkdown, {
            props: {
                source: initialSource,
                streaming: true,
                options: {
                    headerPrefix: 'user-content-'
                },
                renderers: {
                    heading: StableHeading
                } satisfies Partial<Renderers>
            }
        })
        await flushStreamingBatch()

        expect(container.querySelector('[data-stable-heading-id]')).toHaveAttribute(
            'data-stable-heading-id',
            'user-content-intro'
        )

        await rerender({
            source: nextSource,
            streaming: true,
            options: {
                headerPrefix: 'user-content-'
            },
            renderers: {
                heading: StableHeading
            } satisfies Partial<Renderers>
        })
        await flushStreamingBatch()

        expect(container.querySelector('[data-stable-heading-id]')).toHaveAttribute(
            'data-stable-heading-id',
            'user-content-intro'
        )
    })

    test('does not emit ids when headerIds is false during streaming reparses', async () => {
        const initialSource = '# Intro\n\nSee [docs][ref]'
        const nextSource = `${initialSource}\n\n[ref]: https://example.com`

        const { container, rerender } = render(SvelteMarkdown, {
            props: {
                source: initialSource,
                streaming: true,
                options: {
                    headerIds: false
                }
            }
        })
        await flushStreamingBatch()

        expect(container.querySelector('h1')).not.toHaveAttribute('id')

        await rerender({
            source: nextSource,
            streaming: true,
            options: {
                headerIds: false
            }
        })
        await flushStreamingBatch()

        expect(container.querySelector('h1')).not.toHaveAttribute('id')
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

    test('matches static heading ids for a large streamed document', async () => {
        const source = buildLargeHeadingSource(64)
        const staticIds = await renderStaticHeadingIds(source)
        const streamedIds = await renderChunkedHeadingIds(chunkSource(source, 137))

        expect(staticIds.length).toBeGreaterThan(200)
        expect(staticIds.slice(0, 5)).toEqual([
            'intro',
            'intro-1',
            'details',
            'section-0',
            'details-1'
        ])
        expect(new Set(streamedIds).size).toBe(streamedIds.length)
        expect(streamedIds).toEqual(staticIds)
    }, 15_000)

    test('dedupes nested and top-level headings in document order after a streaming reparse', async () => {
        const initialSource = '> # Intro\n\n# Intro\n\nSee [docs][ref]'
        const nextSource = `${initialSource}\n\n[ref]: https://example.com`

        const { container, rerender } = render(SvelteMarkdown, {
            props: {
                source: initialSource,
                streaming: true
            }
        })
        await flushStreamingBatch()

        expect(headingTextsAndIds(container)).toEqual([
            { text: 'Intro', id: 'intro', inBlockquote: true },
            { text: 'Intro', id: 'intro-1', inBlockquote: false }
        ])

        await rerender({
            source: nextSource,
            streaming: true
        })
        await flushStreamingBatch()

        expect(headingTextsAndIds(container)).toEqual([
            { text: 'Intro', id: 'intro', inBlockquote: true },
            { text: 'Intro', id: 'intro-1', inBlockquote: false }
        ])
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

    test('keeps already-rendered top-level nodes mounted during append-only streaming', async () => {
        const mounted: Array<{ text: string | undefined; element: HTMLParagraphElement }> = []
        const destroyed: Array<{ text: string | undefined; element: HTMLParagraphElement }> = []
        const { component, container } = render(SvelteMarkdown, {
            props: {
                source: '',
                streaming: true,
                renderers: {
                    paragraph: TrackedParagraph
                },
                onParagraphMount: (text: string | undefined, element: HTMLParagraphElement) => {
                    mounted.push({ text, element })
                },
                onParagraphDestroy: (text: string | undefined, element: HTMLParagraphElement) => {
                    destroyed.push({ text, element })
                }
            } satisfies SvelteMarkdownProps & {
                onParagraphMount: (text: string | undefined, element: HTMLParagraphElement) => void
                onParagraphDestroy: (
                    text: string | undefined,
                    element: HTMLParagraphElement
                ) => void
            }
        })

        const chunks = [
            'Intro paragraph',
            '\n\nSecond paragraph',
            '\n\n- Streamed list item',
            '\n\nFinal paragraph'
        ]
        let introParagraph: Element | null = null

        for (const chunk of chunks) {
            await act(() => component.writeChunk(chunk))
            await flushStreamingBatch()

            const currentIntro = container.querySelector(
                '[data-tracked-paragraph="Intro paragraph"]'
            )
            expect(currentIntro).toBeInstanceOf(HTMLParagraphElement)

            if (introParagraph === null) {
                introParagraph = currentIntro
            } else {
                expect(currentIntro).toBe(introParagraph)
            }
        }

        expect(destroyed.some((entry) => entry.text === 'Intro paragraph')).toBe(false)
        expect(mounted.filter((entry) => entry.text === 'Intro paragraph')).toHaveLength(1)
    })

    test('keeps a stable root token mounted when a sibling is inserted before it', async () => {
        const stableParagraph = paragraphToken('More')
        const insertedParagraph = paragraphToken('Inserted')
        const mounted: Array<{ text: string | undefined; element: HTMLParagraphElement }> = []
        const destroyed: Array<{ text: string | undefined; element: HTMLParagraphElement }> = []

        const props = {
            source: [stableParagraph],
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

        const { container, rerender } = render(SvelteMarkdown, { props })
        const paragraphBefore = container.querySelector('[data-tracked-paragraph="More"]')

        expect(paragraphBefore).toBeInstanceOf(HTMLParagraphElement)

        await rerender({
            ...props,
            source: [insertedParagraph, stableParagraph]
        })

        const paragraphAfter = container.querySelector('[data-tracked-paragraph="More"]')
        expect(container.querySelector('p')?.textContent).toBe('Inserted')
        expect(paragraphAfter).toBe(paragraphBefore)
        expect(destroyed.some((entry) => entry.text === 'More')).toBe(false)
        expect(mounted.filter((entry) => entry.text === 'More')).toHaveLength(1)
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

    test('keeps existing list item identity while streaming appends list siblings', async () => {
        const parsed = vi.fn()
        const { component, container } = render(SvelteMarkdown, {
            props: {
                source: '',
                streaming: true,
                parsed,
                renderers: {
                    listitem: TrackedListItem
                }
            }
        })

        await act(() => component.writeChunk('- One\n- More\n- Stable'))
        await flushStreamingBatch()

        const itemBefore = container.querySelector('[data-tracked-list-item="More"]')
        const firstMoreToken = firstListToken(lastParsedTokens(parsed))?.items[1]

        expect(itemBefore).toBeInstanceOf(HTMLLIElement)
        expect(firstMoreToken?.text).toBe('More')

        await act(() => component.writeChunk('\n- Tail'))
        await flushStreamingBatch()

        const itemAfter = container.querySelector('[data-tracked-list-item="More"]')
        const nextMoreToken = firstListToken(lastParsedTokens(parsed))?.items[1]

        expect(container.querySelectorAll('li')).toHaveLength(4)
        expect(itemAfter).toBe(itemBefore)
        expect(nextMoreToken).toBe(firstMoreToken)
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

    test('keeps existing table row identity while streaming appends table rows', async () => {
        const parsed = vi.fn()
        const { component, container } = render(SvelteMarkdown, {
            props: {
                source: '',
                streaming: true,
                parsed
            }
        })

        await act(() => component.writeChunk('| Label | Value |\n|---|---|\n| More | Tail |'))
        await flushStreamingBatch()

        const rowBefore = findBodyRow(container, 'MoreTail')
        const firstRowToken = firstTableToken(lastParsedTokens(parsed))?.rows[0]

        expect(rowBefore).toBeInstanceOf(HTMLTableRowElement)
        expect(firstRowToken?.map((cell) => cell.text)).toEqual(['More', 'Tail'])

        await act(() => component.writeChunk('\n| Last | Row |'))
        await flushStreamingBatch()

        const rowAfter = findBodyRow(container, 'MoreTail')
        const nextRowToken = firstTableToken(lastParsedTokens(parsed))?.rows[0]

        expect(findBodyRow(container, 'LastRow')).toBeInstanceOf(HTMLTableRowElement)
        expect(rowAfter).toBe(rowBefore)
        expect(nextRowToken?.[0]).toBe(firstRowToken?.[0])
        expect(nextRowToken?.[1]).toBe(firstRowToken?.[1])
    })
})
