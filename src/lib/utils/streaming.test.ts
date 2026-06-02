import type { StreamingChunk } from '$lib/types.js'
import { describe, expect, it } from 'vitest'
import { isStreamingOffsetChunk } from './streaming.js'

describe('streaming utilities', () => {
    it('detects offset chunks', () => {
        const chunk: StreamingChunk = { value: 'Hello', offset: 0 }

        expect(isStreamingOffsetChunk(chunk)).toBe(true)
    })

    it('does not treat string chunks as offset chunks', () => {
        expect(isStreamingOffsetChunk('Hello')).toBe(false)
    })

    it('does not treat nullish or unrelated objects as offset chunks', () => {
        expect(isStreamingOffsetChunk(null as unknown as StreamingChunk)).toBe(false)
        expect(isStreamingOffsetChunk({ value: 'Hello' } as StreamingChunk)).toBe(false)
    })
})
