import { describe, expect, it } from 'vitest'
import {
    appendStreamingChunk,
    applyStreamingOffsetChunk,
    commitStreamingAppendBuffer,
    getStreamingChunkInstruction,
    shouldFlushStreamingAppendBuffer,
    STREAM_BATCH_MAX_CHARS
} from './streaming-chunks.js'

describe('streaming chunk utilities', () => {
    it('appends string chunks to the pending buffer', () => {
        expect(appendStreamingChunk('Hello', ' World')).toBe('Hello World')
    })

    it('commits a pending append buffer', () => {
        expect(commitStreamingAppendBuffer('Hello', ' World')).toEqual({
            committed: true,
            sourceBuffer: 'Hello World',
            pendingBuffer: ''
        })
    })

    it('does not commit an empty append buffer', () => {
        expect(commitStreamingAppendBuffer('Hello', '')).toEqual({
            committed: false,
            sourceBuffer: 'Hello',
            pendingBuffer: ''
        })
    })

    it('detects when the append buffer reaches the flush threshold', () => {
        expect(shouldFlushStreamingAppendBuffer('a'.repeat(STREAM_BATCH_MAX_CHARS - 1))).toBe(false)
        expect(shouldFlushStreamingAppendBuffer('a'.repeat(STREAM_BATCH_MAX_CHARS))).toBe(true)
    })

    it('creates append instructions for string chunks', () => {
        expect(getStreamingChunkInstruction('Hello', null)).toEqual({
            kind: 'append',
            value: 'Hello',
            nextMode: 'append'
        })
    })

    it('drops string chunks when offset mode is active', () => {
        expect(getStreamingChunkInstruction('Hello', 'offset')).toEqual({
            kind: 'drop',
            message:
                'offset mode active, string chunk dropped. Call resetStream() before switching streaming input modes.'
        })
    })

    it('creates offset instructions for valid offset chunks', () => {
        const chunk = { value: 'Hello', offset: 0 }

        expect(getStreamingChunkInstruction(chunk, null)).toEqual({
            kind: 'offset',
            chunk,
            nextMode: 'offset'
        })
    })

    it('drops invalid offset chunk objects', () => {
        expect(getStreamingChunkInstruction({ value: 'Hello' } as never, null)).toEqual({
            kind: 'drop',
            message:
                'Invalid chunk object passed to writeChunk(); expected { value: string, offset: number }.'
        })
    })

    it('drops offset chunks with invalid offsets', () => {
        expect(getStreamingChunkInstruction({ value: 'Hello', offset: -1 }, null)).toEqual({
            kind: 'drop',
            message:
                'Invalid offset chunk passed to writeChunk(); offset must be a non-negative safe integer.'
        })
    })

    it('drops offset chunks when append mode is active', () => {
        expect(getStreamingChunkInstruction({ value: 'Hello', offset: 0 }, 'append')).toEqual({
            kind: 'drop',
            message:
                'append mode active, offset chunk dropped. Call resetStream() before switching streaming input modes.'
        })
    })

    it('applies offset chunks at exact positions', () => {
        expect(applyStreamingOffsetChunk('Hello World', { value: 'Svelte', offset: 6 })).toBe(
            'Hello Svelte'
        )
    })

    it('pads gaps for offset chunks', () => {
        expect(applyStreamingOffsetChunk('ab', { value: 'XY', offset: 4 })).toBe('ab  XY')
    })
})
