import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    isStreamFlushProfilingEnabled,
    profileStreamFlush,
    STREAM_FLUSH_MEASURE,
    STREAM_FLUSH_PROFILE_FLAG
} from './stream-flush-profile.js'

type ProfileGlobal = typeof globalThis & { [STREAM_FLUSH_PROFILE_FLAG]?: boolean }

const setFlag = (value: boolean | undefined) => {
    if (value === undefined) {
        delete (globalThis as ProfileGlobal)[STREAM_FLUSH_PROFILE_FLAG]
    } else {
        ;(globalThis as ProfileGlobal)[STREAM_FLUSH_PROFILE_FLAG] = value
    }
}

describe('stream-flush-profile', () => {
    afterEach(() => {
        setFlag(undefined)
        vi.restoreAllMocks()
    })

    it('is disabled by default', () => {
        expect(isStreamFlushProfilingEnabled()).toBe(false)
    })

    it('runs the flush without measuring when disabled', () => {
        const measure = vi.spyOn(performance, 'measure')
        const flush = vi.fn()

        profileStreamFlush(flush)

        expect(flush).toHaveBeenCalledOnce()
        expect(measure).not.toHaveBeenCalled()
    })

    it('records a named measure with detail when the global flag is set', () => {
        setFlag(true)
        const measure = vi.spyOn(performance, 'measure')
        const flush = vi.fn()

        expect(isStreamFlushProfilingEnabled()).toBe(true)
        profileStreamFlush(flush, { sourceLength: 42 })

        expect(flush).toHaveBeenCalledOnce()
        expect(measure).toHaveBeenCalledOnce()
        const [name, options] = measure.mock.calls[0] as [string, PerformanceMeasureOptions]
        expect(name).toBe(STREAM_FLUSH_MEASURE)
        expect(options.detail).toEqual({ sourceLength: 42 })
        expect(typeof options.start).toBe('number')
        expect(typeof options.end).toBe('number')
        expect((options.end as number) >= (options.start as number)).toBe(true)
    })

    it('still records the measure when the flush throws', () => {
        setFlag(true)
        const measure = vi.spyOn(performance, 'measure')

        expect(() =>
            profileStreamFlush(() => {
                throw new Error('boom')
            })
        ).toThrow('boom')
        expect(measure).toHaveBeenCalledOnce()
    })

    it('treats non-boolean flag values as disabled', () => {
        ;(globalThis as Record<string, unknown>)[STREAM_FLUSH_PROFILE_FLAG] = 'yes'
        expect(isStreamFlushProfilingEnabled()).toBe(false)
    })
})
