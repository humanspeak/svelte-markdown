/**
 * Shared harness for streaming component suites.
 *
 * The component batches streaming flushes behind requestAnimationFrame, so
 * deterministic tests need fake timers plus an rAF stub on a 16ms setTimeout
 * cadence; `flushStreamingBatch()` then drains one batch window with a single
 * 50ms advance. Five suites share this exact timing — it lives here so the
 * cadence and the batch window can never drift apart between copies.
 */

import { act } from '@testing-library/svelte'
import { afterEach, beforeEach, vi } from 'vitest'
import { tokenCache } from '../../utils/token-cache.js'

/**
 * Registers the beforeEach/afterEach pair for a streaming suite: clears the
 * token cache, installs fake timers and the rAF/cAF stubs, and tears them
 * down again. Call once at the top level of the test file.
 */
export const useStreamingTestHarness = (): void => {
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
        // A failing assertion skips a test's own `mockRestore()`, and `vi.spyOn`
        // on an already-spied method hands back the existing mock — call history
        // included. Restore here so one failure can't cascade into the next test.
        vi.restoreAllMocks()
    })
}

/** Drains one rAF-batched streaming flush window. */
export const flushStreamingBatch = async (): Promise<void> => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(50)
    })
}
