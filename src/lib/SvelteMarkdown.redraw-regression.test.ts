/**
 * Redraw-regression harness.
 *
 * This library's streaming render path leans on a stack of anti-redraw
 * machinery: source-offset stable keys on every `{#each}` block, streaming
 * prefix reuse by object identity, recursive tail-token reuse, and inline
 * fast paths that skip Parser instantiation for text/space/default-HTML
 * tokens. None of that was guarded by an automated test — only a manual
 * bench page read the dev-only instantiation counter (`window.__svmParserCount`).
 *
 * These tests convert that counter into permanent CI tripwires plus DOM
 * node-identity assertions, so a keying/reuse regression fails loudly instead
 * of only showing up as a wall-clock slowdown (which `performance.test.ts` is
 * far too noisy to catch).
 *
 * The counter is DEV-only (`import.meta.env.DEV`) and cumulative across every
 * test in the file, so every assertion is a DELTA from a snapshot taken right
 * before the action under test — never an absolute count.
 */

import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/svelte'
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

interface SVMWindow extends Window {
    __svmParserCount?: number
    __svmParserByType?: Record<string, number>
}
const readParserCount = () => (window as SVMWindow).__svmParserCount ?? 0

describe('redraw regression harness', () => {
    test('calibration: the DEV Parser counter is live under Vitest', async () => {
        const before = readParserCount()
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })
        await act(() => component.writeChunk('# Title\n\nFirst paragraph.\n\nSecond para'))
        await flushStreamingBatch()

        expect(container.querySelectorAll('h1')).toHaveLength(1)
        expect(container.querySelectorAll('p')).toHaveLength(2)

        // Counter must have advanced past the pre-render snapshot: this proves
        // the `import.meta.env.DEV` guard in Parser.svelte is active here.
        expect(readParserCount()).toBeGreaterThan(before)
        expect(readParserCount()).toBeGreaterThan(0)
    })

    test('growing the tail block in place spawns zero new Parsers', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })
        await act(() => component.writeChunk('# Title\n\nFirst paragraph.\n\nSecond para'))
        await flushStreamingBatch()
        expect(container.querySelectorAll('p')).toHaveLength(2)

        // The appended text extends the still-open second paragraph. Its token
        // is replaced but its source-offset key is stable, so the keyed each
        // block updates in place — no token remounts, no new Parser instances.
        const before = readParserCount()
        await act(() => component.writeChunk(' grows in place with more text'))
        await flushStreamingBatch()

        expect(screen.getByText(/grows in place/)).toBeInTheDocument()
        expect(readParserCount() - before).toBe(0)
    })

    test('appending a new block costs O(1) Parsers, not O(document)', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })
        await act(() => component.writeChunk('# Title\n\nFirst paragraph.\n\nSecond para'))
        await flushStreamingBatch()
        expect(container.querySelectorAll('p')).toHaveLength(2)

        const before = readParserCount()
        await act(() => component.writeChunk('\n\nThird paragraph.\n\n'))
        await flushStreamingBatch()

        expect(container.querySelectorAll('p')).toHaveLength(3)

        // current: 1 — one new Parser for the appended paragraph token; its
        // leaf text child is inlined (issue #286), so it costs nothing. The
        // [1, 3] band leaves headroom for benign structural churn while still
        // catching a whole-document redraw, which would be >= the block count.
        const delta = readParserCount() - before
        expect(delta).toBeGreaterThanOrEqual(1)
        expect(delta).toBeLessThanOrEqual(3)
    })

    test('DOM node identity survives streaming flushes', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })
        await act(() => component.writeChunk('# Title\n\nFirst paragraph.\n\nSecond para'))
        await flushStreamingBatch()

        const h1 = container.querySelector('h1')
        const firstP = container.querySelectorAll('p')[0]
        expect(h1).not.toBeNull()
        expect(firstP).not.toBeUndefined()

        // In-place growth of the open tail block.
        await act(() => component.writeChunk(' grows in place with more text'))
        await flushStreamingBatch()

        // A brand-new appended block.
        await act(() => component.writeChunk('\n\nThird paragraph.\n\n'))
        await flushStreamingBatch()

        // The unchanged prefix — the heading and the first paragraph — keeps
        // its source-offset keys through both flushes, so Svelte must update
        // those keyed blocks in place rather than recreate their DOM nodes.
        expect(container.querySelector('h1')).toBe(h1)
        expect(container.querySelectorAll('p')[0]).toBe(firstP)
    })

    test('non-streaming source replacement preserves prefix DOM with bounded delta', async () => {
        const { container, rerender } = render(SvelteMarkdown, {
            props: { source: '# Title\n\nPara one.\n\nPara two.' }
        })

        const h1 = container.querySelector('h1')
        const firstP = container.querySelectorAll('p')[0]
        expect(h1).not.toBeNull()
        expect(firstP).not.toBeUndefined()

        const before = readParserCount()
        await act(() => rerender({ source: '# Title\n\nPara one.\n\nPara two.\n\nPara three.' }))

        expect(container.querySelectorAll('p')).toHaveLength(3)

        // A full re-parse produces all-new token objects, but the source-offset
        // keys of the unchanged prefix are identical, so its keyed blocks (and
        // therefore DOM nodes and Parser instances) stay alive. Only the newly
        // appended block should instantiate — a small constant, never O(blocks).
        expect(container.querySelector('h1')).toBe(h1)
        expect(container.querySelectorAll('p')[0]).toBe(firstP)

        const delta = readParserCount() - before
        expect(delta).toBeGreaterThanOrEqual(1)
        expect(delta).toBeLessThanOrEqual(3)
    })
})
