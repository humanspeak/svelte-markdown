/**
 * Component-level coverage for stream identity handling.
 *
 * Two complementary guards against a stale streaming buffer leaking into a
 * new stream when a component instance outlives a single stream (recycled
 * virtual-list rows, long-lived chat bubbles):
 *
 * 1. The `streamId` prop — a change in identity is a declarative
 *    `resetStream(source)`: buffer, input-mode lock, and incremental parser
 *    are all discarded.
 * 2. Offset-restart reconciliation in `writeChunk()` — an offset-0 chunk
 *    that diverges from the buffered content is treated as a new stream
 *    (reset + warn) instead of overwriting the prefix and leaving the old
 *    stream's tail in the DOM.
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

describe('streamId prop', () => {
    test('changing streamId resets the append-mode buffer', async () => {
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, streamId: 'message-1' }
        })

        await act(() => harness.component.writeChunk('First stream text.'))
        await flushStreamingBatch()
        expect(harness.container.textContent).toContain('First stream text.')

        await harness.rerender({ source: '', streaming: true, streamId: 'message-2' })
        await act(() => harness.component.writeChunk('Second stream.'))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Second stream.')
        expect(harness.container.textContent).not.toContain('First stream text.')
    })

    test('changing streamId unlocks the input mode', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, streamId: 1 }
        })

        // Lock into offset mode on stream 1.
        await act(() => harness.component.writeChunk({ value: 'Offset stream', offset: 0 }))
        await flushStreamingBatch()

        // Stream 2 uses plain string chunks — without the identity reset this
        // would be dropped with a mode-lock warning.
        await harness.rerender({ source: '', streaming: true, streamId: 2 })
        await act(() => harness.component.writeChunk('Append stream'))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Append stream')
        expect(harness.container.textContent).not.toContain('Offset stream')
        expect(warn).not.toHaveBeenCalled()
        warn.mockRestore()
    })

    test('changing streamId re-seeds from the current source', async () => {
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, streamId: 'a' }
        })

        await act(() => harness.component.writeChunk('Old buffer.'))
        await flushStreamingBatch()

        await harness.rerender({ source: 'Seeded text.', streaming: true, streamId: 'b' })
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Seeded text.')
        expect(harness.container.textContent).not.toContain('Old buffer.')
    })

    test('an unchanged streamId preserves the buffer across rerenders', async () => {
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, streamId: 'stable' }
        })

        await act(() => harness.component.writeChunk('Hello'))
        await flushStreamingBatch()
        await harness.rerender({ source: '', streaming: true, streamId: 'stable' })
        await act(() => harness.component.writeChunk(' World'))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Hello World')
    })

    test('omitting streamId leaves reset responsibility with the consumer', async () => {
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => harness.component.writeChunk('First.'))
        await flushStreamingBatch()
        await act(() => harness.component.writeChunk(' Second.'))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('First. Second.')
    })

    test('writeChunk reconciles a streamId change ahead of the effect flush', async () => {
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, streamId: 1 }
        })

        await act(() => harness.component.writeChunk('Old stream.'))
        await flushStreamingBatch()

        // rerender + immediate write in the same act: the imperative path
        // must see the new identity even if the $effect hasn't run yet.
        await act(async () => {
            await harness.rerender({ source: '', streaming: true, streamId: 2 })
            harness.component.writeChunk('New stream.')
        })
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('New stream.')
        expect(harness.container.textContent).not.toContain('Old stream.')
    })

    test('an explicit resetStream acknowledges the current identity', async () => {
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, streamId: 1 }
        })

        await act(() => harness.component.writeChunk('Old stream.'))
        await flushStreamingBatch()

        // Consumer rotates identity AND explicitly seeds — the effect must
        // not fire a second (source-seeded) reset that clobbers the seed.
        await act(async () => {
            await harness.rerender({ source: '', streaming: true, streamId: 2 })
            harness.component.resetStream('Explicit seed.')
        })
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Explicit seed.')
    })
})

describe('writeChunk offset-restart reconciliation', () => {
    test('a divergent offset-0 chunk resets instead of keeping the old tail', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() =>
            harness.component.writeChunk({
                value: 'The previous stream wrote a long paragraph of text.',
                offset: 0
            })
        )
        await flushStreamingBatch()

        // New stream begins at offset 0 without resetStream().
        await act(() => harness.component.writeChunk({ value: 'Fresh start.', offset: 0 }))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Fresh start.')
        expect(harness.container.textContent).not.toContain('long paragraph')
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('treating it as a new stream'))
        warn.mockRestore()
    })

    test('the reconciled stream continues appending at its own offsets', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => harness.component.writeChunk({ value: 'Old content here.', offset: 0 }))
        await flushStreamingBatch()

        await act(() => harness.component.writeChunk({ value: 'New ', offset: 0 }))
        await act(() => harness.component.writeChunk({ value: 'stream.', offset: 4 }))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('New stream.')
        expect(harness.container.textContent).not.toContain('Old content')
        warn.mockRestore()
    })

    test('an idempotent replay at offset 0 does not reset or warn', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => harness.component.writeChunk({ value: 'Hello ', offset: 0 }))
        await act(() => harness.component.writeChunk({ value: 'World', offset: 6 }))
        await flushStreamingBatch()

        // Replay of the first chunk (e.g. reconnect redelivery).
        await act(() => harness.component.writeChunk({ value: 'Hello ', offset: 0 }))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Hello World')
        expect(warn).not.toHaveBeenCalled()
        warn.mockRestore()
    })

    test('a cumulative snapshot at offset 0 extends without resetting', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => harness.component.writeChunk({ value: 'Hello', offset: 0 }))
        await flushStreamingBatch()
        await act(() => harness.component.writeChunk({ value: 'Hello World', offset: 0 }))
        await flushStreamingBatch()

        expect(harness.container.textContent).toContain('Hello World')
        expect(warn).not.toHaveBeenCalled()
        warn.mockRestore()
    })
})
