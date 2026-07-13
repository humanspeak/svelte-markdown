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
import { describe, expect, test } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'

useStreamingTestHarness()

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
