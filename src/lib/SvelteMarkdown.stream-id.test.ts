/**
 * Coverage for the `streamId` prop.
 *
 * Chat UIs frequently recycle a single `<SvelteMarkdown streaming>` instance
 * across assistant turns (non-keyed `{#each}`, virtual lists, or a keyed each
 * whose key is stable per slot rather than per message). Because the imperative
 * buffer is instance state, a recycled component starts the next stream with the
 * previous message still in `streamSourceBuffer` and the input mode still locked
 * from the previous session.
 *
 * `streamId` gives consumers a declarative reset: change it and the component
 * drops the buffer, the pending flush, the parser, and the input-mode lock.
 *
 * The three failure modes pinned here:
 *   1. append mode  — old message prefixes the new one
 *   2. offset mode  — old message's *tail* survives past the new write
 *   3. mode lock    — a new session can't switch string/offset without a reset
 */

import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import { describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'
import StreamIdRaceHarness from './test/streaming/StreamIdRaceHarness.svelte'

useStreamingTestHarness()

describe('streamId prop', () => {
    describe('append mode', () => {
        test('changing streamId drops the previous message from the buffer', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            await act(() => component.writeChunk('# First message'))
            await flushStreamingBatch()
            expect(container.querySelector('h1')?.textContent).toBe('First message')

            await act(() => rerender({ source: '', streaming: true, streamId: 'msg-2' }))
            expect(container.textContent?.trim()).toBe('')

            await act(() => component.writeChunk('# Second message'))
            await flushStreamingBatch()

            // The old heading must not survive, and the new heading must not be
            // a concatenation of both messages.
            expect(container.querySelectorAll('h1')).toHaveLength(1)
            expect(container.querySelector('h1')?.textContent).toBe('Second message')
            expect(container.textContent).not.toContain('First message')
        })

        test('a pending (unflushed) chunk from the old stream is discarded', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            // Below STREAM_BATCH_MAX_CHARS, so this sits in the pending buffer.
            await act(() => component.writeChunk('stale text'))

            await act(() => rerender({ source: '', streaming: true, streamId: 'msg-2' }))
            await flushStreamingBatch()

            expect(container.textContent?.trim()).toBe('')
        })

        test('writeChunk in the same tick as a streamId change targets the new stream', async () => {
            // writeChunk() is synchronous while the prop-driven reset runs in an
            // $effect, so a parent that swaps streamId and immediately writes must
            // still land on the new stream's buffer, not the previous message's.
            // Driven through a real parent: rerender() would flushSync and hide it.
            const { component, container } = render(StreamIdRaceHarness)

            await act(() => component.write('# First'))
            await flushStreamingBatch()
            expect(container.querySelector('h1')?.textContent).toBe('First')

            await act(() => component.switchStreamAndWrite('msg-2', '# Second'))
            await flushStreamingBatch()

            expect(container.querySelectorAll('h1')).toHaveLength(1)
            expect(container.querySelector('h1')?.textContent).toBe('Second')
            expect(container.textContent).not.toContain('First')
        })

        test('same streamId keeps appending to the same buffer', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            await act(() => component.writeChunk('Hello'))
            await flushStreamingBatch()

            await act(() => rerender({ source: '', streaming: true, streamId: 'msg-1' }))

            await act(() => component.writeChunk(' world'))
            await flushStreamingBatch()

            expect(container.querySelector('p')?.textContent).toBe('Hello world')
        })
    })

    describe('offset mode', () => {
        test('changing streamId clears the stale tail of the previous message', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            await act(() => component.writeChunk({ value: 'A long first message', offset: 0 }))
            await flushStreamingBatch()
            expect(container.querySelector('p')?.textContent).toBe('A long first message')

            await act(() => rerender({ source: '', streaming: true, streamId: 'msg-2' }))

            // Overwrite semantics preserve any suffix beyond the written span,
            // so without a reset this would render "Shortst message".
            await act(() => component.writeChunk({ value: 'Short', offset: 0 }))
            await flushStreamingBatch()

            expect(container.querySelector('p')?.textContent).toBe('Short')
        })
    })

    describe('input-mode lock', () => {
        test('changing streamId unlocks offset -> append without warning', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            await act(() => component.writeChunk({ value: 'offset stream', offset: 0 }))
            await flushStreamingBatch()

            await act(() => rerender({ source: '', streaming: true, streamId: 'msg-2' }))

            await act(() => component.writeChunk('append stream'))
            await flushStreamingBatch()

            expect(container.querySelector('p')?.textContent).toBe('append stream')
            expect(warnSpy).not.toHaveBeenCalled()

            warnSpy.mockRestore()
        })

        test('changing streamId unlocks append -> offset without warning', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            await act(() => component.writeChunk('append stream'))
            await flushStreamingBatch()

            await act(() => rerender({ source: '', streaming: true, streamId: 'msg-2' }))

            await act(() => component.writeChunk({ value: 'offset stream', offset: 0 }))
            await flushStreamingBatch()

            expect(container.querySelector('p')?.textContent).toBe('offset stream')
            expect(warnSpy).not.toHaveBeenCalled()

            warnSpy.mockRestore()
        })
    })

    describe('source prop interaction', () => {
        test('changing streamId reseeds the baseline from a non-empty source prop', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            await act(() => component.writeChunk('# Old'))
            await flushStreamingBatch()

            await act(() => rerender({ source: '# Seed', streaming: true, streamId: 'msg-2' }))
            await flushStreamingBatch()
            expect(container.querySelector('h1')?.textContent).toBe('Seed')

            // Subsequent chunks append to the seeded baseline, not the old buffer.
            await act(() => component.writeChunk('\n\ntail'))
            await flushStreamingBatch()

            expect(container.querySelector('h1')?.textContent).toBe('Seed')
            expect(container.querySelector('p')?.textContent).toBe('tail')
            expect(container.textContent).not.toContain('Old')
        })

        test('changing streamId and source together does not double-apply the source', async () => {
            const { container, rerender } = render(SvelteMarkdown, {
                props: { source: '# One', streaming: true, streamId: 'msg-1' }
            })
            await flushStreamingBatch()

            await act(() => rerender({ source: '# Two', streaming: true, streamId: 'msg-2' }))
            await flushStreamingBatch()

            expect(container.querySelectorAll('h1')).toHaveLength(1)
            expect(container.querySelector('h1')?.textContent).toBe('Two')
        })

        test('changing streamId with a token-array source swaps the tokens', async () => {
            const first = [
                {
                    type: 'paragraph',
                    raw: 'one',
                    text: 'one',
                    tokens: [{ type: 'text', raw: 'one', text: 'one' }]
                }
            ]
            const second = [
                {
                    type: 'paragraph',
                    raw: 'two',
                    text: 'two',
                    tokens: [{ type: 'text', raw: 'two', text: 'two' }]
                }
            ]

            const { container, rerender } = render(SvelteMarkdown, {
                props: { source: first, streaming: true, streamId: 'msg-1' }
            })
            await flushStreamingBatch()

            await act(() => rerender({ source: second, streaming: true, streamId: 'msg-2' }))
            await flushStreamingBatch()

            expect(container.textContent).toContain('two')
            expect(container.textContent).not.toContain('one')
        })
    })

    describe('non-streaming and passthrough behavior', () => {
        test('streamId is inert when streaming is false', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
            const { container, rerender } = render(SvelteMarkdown, {
                props: { source: '# Static', streaming: false, streamId: 'msg-1' }
            })

            expect(container.querySelector('h1')?.textContent).toBe('Static')

            await act(() => rerender({ source: '# Static', streaming: false, streamId: 'msg-2' }))

            expect(container.querySelector('h1')?.textContent).toBe('Static')
            expect(warnSpy).not.toHaveBeenCalled()

            warnSpy.mockRestore()
        })

        test('streamId is not forwarded to the DOM as an attribute', async () => {
            const { container } = render(SvelteMarkdown, {
                props: { source: '# Title', streaming: true, streamId: 'msg-1' }
            })
            await flushStreamingBatch()

            expect(container.innerHTML.toLowerCase()).not.toContain('streamid')
        })

        test('numeric streamId values are supported', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 1 }
            })

            await act(() => component.writeChunk('# One'))
            await flushStreamingBatch()

            await act(() => rerender({ source: '', streaming: true, streamId: 2 }))
            await act(() => component.writeChunk('# Two'))
            await flushStreamingBatch()

            expect(container.querySelectorAll('h1')).toHaveLength(1)
            expect(container.querySelector('h1')?.textContent).toBe('Two')
        })
    })

    // The reset is keyed on strict inequality, so a falsy-but-present streamId
    // must still reset. A truthiness guard (`streamId && lastStreamId !== streamId`)
    // would still pass the 0 -> 1 case, but fails the two undefined cases.
    describe('falsy and undefined streamId values', () => {
        test('resets when streamId transitions from 0 to another value', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 0 }
            })

            await act(() => component.writeChunk('# Zero'))
            await flushStreamingBatch()
            expect(container.querySelector('h1')?.textContent).toBe('Zero')

            await act(() => rerender({ source: '', streaming: true, streamId: 1 }))
            await act(() => component.writeChunk('# One'))
            await flushStreamingBatch()

            expect(container.querySelectorAll('h1')).toHaveLength(1)
            expect(container.querySelector('h1')?.textContent).toBe('One')
        })

        test('resets when streamId transitions from undefined to 0', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true }
            })

            await act(() => component.writeChunk('# Unset'))
            await flushStreamingBatch()
            expect(container.querySelector('h1')?.textContent).toBe('Unset')

            await act(() => rerender({ source: '', streaming: true, streamId: 0 }))
            await act(() => component.writeChunk('# Zero'))
            await flushStreamingBatch()

            expect(container.querySelectorAll('h1')).toHaveLength(1)
            expect(container.querySelector('h1')?.textContent).toBe('Zero')
        })

        test('resets when streamId transitions from a value back to undefined', async () => {
            const { component, container, rerender } = render(SvelteMarkdown, {
                props: { source: '', streaming: true, streamId: 'msg-1' }
            })

            await act(() => component.writeChunk('# Named'))
            await flushStreamingBatch()

            await act(() => rerender({ source: '', streaming: true, streamId: undefined }))
            await act(() => component.writeChunk('# Unnamed'))
            await flushStreamingBatch()

            expect(container.querySelectorAll('h1')).toHaveLength(1)
            expect(container.querySelector('h1')?.textContent).toBe('Unnamed')
        })
    })
})
