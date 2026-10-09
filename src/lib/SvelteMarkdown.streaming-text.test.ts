import { act, render } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import Markdown from './test/streaming-text/Markdown.svelte'
import Race from './test/streaming-text/Race.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'
import { ProvenanceCollector } from './utils/streaming-provenance.js'
import { StreamingTextLedger } from './utils/streaming-text.js'

useStreamingTestHarness()
const parts = (container: HTMLElement) => Array.from(container.querySelectorAll('span[data-id]'))
const words = (container: HTMLElement) =>
    parts(container).filter((node) => node.textContent?.trim())

describe('streaming text metadata', () => {
    it.each([false, true])(
        'delivers baseline and append metadata to rawtext (component=%s)',
        async (component) => {
            const { container, component: markdown } = render(Markdown, {
                source: 'old ',
                component
            })
            expect(words(container)[0].getAttribute('data-new')).toBe('false')
            await act(() => markdown.writeChunk('new'))
            await flushStreamingBatch()
            expect(container.textContent).toBe('old new')
            expect(words(container).map((node) => node.getAttribute('data-new'))).toEqual([
                'false',
                'true'
            ])
            expect(container.querySelector('[streamingtext]')).toBeNull()
        }
    )
    it('preserves mounted unfinished words across batches and keeps repeated words distinct', async () => {
        const { container, component } = render(Markdown)
        await act(() => component.writeChunk('hel'))
        await flushStreamingBatch()
        const first = words(container)[0]
        await act(() => component.writeChunk('lo hello'))
        await flushStreamingBatch()
        expect(words(container)[0]).toBe(first)
        expect(first.textContent).toBe('hello')
        expect(first.getAttribute('data-new')).toBe('true')
        expect(words(container)[1].getAttribute('data-id')).not.toBe(first.getAttribute('data-id'))
        expect(words(container)[1].getAttribute('data-index')).toBe('1')
    })
    it.each([
        ['**a', '** a', 'strong'],
        ['[a', '](https://example.com) a', 'a']
    ])('never replays the old label when %s completes', async (source, chunk, selector) => {
        const { container, component } = render(Markdown, { source })
        await act(() => component.writeChunk(chunk))
        await flushStreamingBatch()
        expect(container.querySelector(`${selector} span`)?.getAttribute('data-new')).toBe('false')
        expect(words(container).at(-1)?.textContent).toBe('a')
        expect(words(container).at(-1)?.getAttribute('data-new')).toBe('true')
    })
    it('classifies offset gaps and fills, preserves an untouched suffix, and ignores identical patches', async () => {
        const { container, component } = render(Markdown)
        await act(() => component.writeChunk({ offset: 1, value: ' world' }))
        expect(words(container)[0].getAttribute('data-new')).toBe('true')
        const suffix = words(container)[0]
        await act(() => component.writeChunk({ offset: 0, value: 'H' }))
        expect(words(container)[0].getAttribute('data-change')).toBe('revision')
        expect(words(container)[0].getAttribute('data-new')).toBe('false')
        expect(words(container)[1]).toBe(suffix)
        const ids = words(container).map((node) => node.getAttribute('data-id'))
        await act(() => component.writeChunk({ offset: 0, value: 'H' }))
        expect(words(container).map((node) => node.getAttribute('data-id'))).toEqual(ids)
    })
    it('isolates instances and makes reset seeds baseline with new epochs', async () => {
        const a = render(Markdown),
            b = render(Markdown)
        await act(() => a.component.writeChunk('a'))
        await flushStreamingBatch()
        expect(b.container.textContent).toBe('')
        const id = words(a.container)[0].getAttribute('data-id')
        await act(() => a.component.resetStream('a'))
        expect(words(a.container)[0].getAttribute('data-new')).toBe('false')
        expect(words(a.container)[0].getAttribute('data-id')).not.toBe(id)
    })
    it('baselines replacement sources, re-enabling and streamId changes', async () => {
        const { container, rerender } = render(Markdown, { source: '' })
        await rerender({ source: 'first' })
        await flushStreamingBatch()
        expect(words(container)[0].getAttribute('data-new')).toBe('true')
        await rerender({ source: 'second' })
        expect(words(container)[0].getAttribute('data-new')).toBe('false')
        await rerender({ source: 'second', streamingText: false })
        await rerender({ source: 'second', streamingText: true })
        expect(words(container)[0].getAttribute('data-new')).toBe('false')
        await rerender({ source: 'second', streamingText: true, streamId: 1 })
        expect(words(container)[0].getAttribute('data-new')).toBe('false')
    })
    it.each([
        ['e', '\u0301'],
        ['👩', '‍💻'],
        ['🇺', '🇸'],
        ['\ud83d', '\ude00']
    ])('keeps trailing grapheme identity for %s', async (first, last) => {
        const { container, component } = render(Markdown, { granularity: 'grapheme' })
        await act(() => component.writeChunk(first))
        await flushStreamingBatch()
        const node = parts(container)[0]
        await act(() => component.writeChunk(last))
        await flushStreamingBatch()
        expect(parts(container)[0]).toBe(node)
        expect(node.textContent).toBe(first + last)
    })
    it('retains default DOM and excludes code from rawtext segmentation', () => {
        const plain = render(SvelteMarkdown, { source: '**a** `code`', streaming: true })
        expect(plain.container.querySelector('span')).toBeNull()
        const tracked = render(Markdown, { source: 'a `code`\n\n```js\nblock\n```' })
        expect(tracked.container.querySelector('code span')).toBeNull()
    })
    it('routes nested table/list/HTML leaves with exact provenance', () => {
        const { container } = render(Markdown, {
            source: '- **a** *b* [c](https://example.com)\n\n| d |\n|---|\n| e |\n\n<div>f&amp;g</div>'
        })
        expect(words(container).map((node) => node.textContent)).toEqual([
            'a',
            'b',
            'c',
            'd',
            'e',
            'f',
            '&',
            'g'
        ])
        expect(
            words(container).every((node) => node.getAttribute('data-provenance') === 'exact')
        ).toBe(true)
    })
})

describe('tracking lifecycle boundaries', () => {
    it('resets arrival identities before a same-tick streamId/write', async () => {
        const { container, component } = render(Race)
        await act(() => component.write('old'))
        await flushStreamingBatch()
        const oldId = words(container)[0].getAttribute('data-id')
        await act(() => component.switchAndWrite('new'))
        await flushStreamingBatch()
        expect(container.textContent).toBe('new')
        expect(words(container)[0].getAttribute('data-id')).not.toBe(oldId)
        expect(words(container)[0].getAttribute('data-new')).toBe('true')
    })
    it('discards tracking across streaming and async mode switches', async () => {
        const { container, rerender } = render(Markdown, { source: 'old' })
        await rerender({ source: 'old new' })
        await flushStreamingBatch()
        expect(words(container).at(-1)?.getAttribute('data-new')).toBe('true')
        await rerender({ source: 'old new', streaming: false })
        expect(words(container).every((node) => node.getAttribute('data-new') === 'false')).toBe(
            true
        )
        await rerender({ source: 'old new', streaming: true })
        expect(words(container).every((node) => node.getAttribute('data-new') === 'false')).toBe(
            true
        )
        const warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        await rerender({
            source: 'async',
            streaming: true,
            extensions: [{ async: true, walkTokens: async () => {} }]
        })
        await act(async () => {
            await Promise.resolve()
            await Promise.resolve()
        })
        expect(container.textContent).toBe('async')
        expect(words(container).every((node) => node.getAttribute('data-new') === 'false')).toBe(
            true
        )
        await rerender({ source: 'async', streaming: true, extensions: [] })
        expect(words(container).every((node) => node.getAttribute('data-new') === 'false')).toBe(
            true
        )
        warning.mockRestore()
    })
    it('keeps entrances for markdown text when a sync tokenizer extension is loaded', async () => {
        const math = {
            extensions: [
                {
                    name: 'inlineMath',
                    level: 'inline' as const,
                    start: (src: string) => src.indexOf('$'),
                    tokenizer(src: string) {
                        const match = /^\$([^$\n]+?)\$/.exec(src)
                        if (match) return { type: 'inlineMath', raw: match[0], text: match[1] }
                    }
                }
            ]
        }
        const { container, component } = render(Markdown, { source: 'old ', extensions: [math] })
        await act(() => component.writeChunk('$x$ new'))
        await flushStreamingBatch()
        const last = words(container).at(-1)!
        expect(last.textContent).toBe('new')
        expect(last.getAttribute('data-provenance')).toBe('exact')
        expect(last.getAttribute('data-new')).toBe('true')
        expect(words(container)[0].getAttribute('data-new')).toBe('false')
    })
    it('never traverses a ledger or captures provenance unless tracking is enabled', async () => {
        const prepare = vi.spyOn(StreamingTextLedger.prototype, 'prepare')
        const capture = vi.spyOn(ProvenanceCollector.prototype, 'capture')
        const { container, component } = render(SvelteMarkdown, { source: 'old', streaming: true })
        await act(() => component.writeChunk(' new'))
        await flushStreamingBatch()
        expect(container.textContent).toBe('old new')
        expect(Array.from(container.querySelectorAll('*'), (node) => node.tagName)).toEqual(['P'])
        expect(prepare).not.toHaveBeenCalled()
        expect(capture).not.toHaveBeenCalled()
        prepare.mockRestore()
        capture.mockRestore()
    })
    it('shrinking snapshots remove segments and a replacement seed starts baseline', async () => {
        const { container, rerender } = render(Markdown, { source: 'same same' })
        const ids = words(container).map((node) => node.getAttribute('data-id'))
        expect(new Set(ids).size).toBe(2)
        await rerender({ source: 'same' })
        expect(words(container)).toHaveLength(1)
        expect(words(container)[0].getAttribute('data-new')).toBe('false')
        expect(words(container)[0].getAttribute('data-id')).not.toBe(ids[0])
    })
})
