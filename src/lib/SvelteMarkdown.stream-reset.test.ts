/**
 * Characterization coverage for reset-to-empty while streaming.
 *
 * Two independent code paths collapse a live stream back to an empty
 * document, and both must leave the DOM empty:
 *   1. imperative `resetStream('')` — routes through `resetStreamingState('')`
 *   2. prop-driven `source: ''`     — routes through `syncStreamingSourceFromProp('')`
 *
 * These are green-before-and-after characterization tests (see plan 002 of
 * the redraw-hardening batch). They pin the observable reset-to-empty DOM
 * behavior so the refactor to the #291-mandated reference-replacement pattern
 * (assign a fresh empty array instead of shrinking in place) is provably
 * behavior-preserving.
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
    vi.restoreAllMocks()
})

const flushStreamingBatch = async () => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(50)
    })
}

const MULTI_BLOCK = '# Title\n\nOne.\n\nTwo.'

describe('stream reset to empty', () => {
    test('imperative resetStream("") empties the DOM', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => component.writeChunk(MULTI_BLOCK))
        await flushStreamingBatch()

        expect(container.querySelector('h1')?.textContent).toBe('Title')
        expect(container.querySelectorAll('h1, p')).toHaveLength(3)

        await act(() => component.resetStream(''))
        await flushStreamingBatch()

        expect(container.textContent?.trim()).toBe('')
        expect(container.querySelectorAll('h1, p')).toHaveLength(0)
    })

    test('prop-driven source: "" while streaming empties the DOM', async () => {
        const { container, rerender } = render(SvelteMarkdown, {
            props: { source: MULTI_BLOCK, streaming: true }
        })
        await flushStreamingBatch()

        expect(container.querySelector('h1')?.textContent).toBe('Title')
        expect(container.querySelectorAll('h1, p')).toHaveLength(3)

        await act(() => rerender({ source: '', streaming: true }))
        await flushStreamingBatch()

        expect(container.textContent?.trim()).toBe('')
        expect(container.querySelectorAll('h1, p')).toHaveLength(0)
    })
})
