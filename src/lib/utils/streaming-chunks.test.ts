import { describe, expect, it } from 'vitest'
import {
    appendStreamingChunk,
    applyStreamingOffsetChunk,
    commitStreamingAppendBuffer,
    getStreamingChunkInstruction,
    isOffsetStreamRestart,
    shouldFlushStreamingAppendBuffer,
    STREAM_BATCH_MAX_CHARS,
    STREAM_MAX_OFFSET_GAP
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

    it('drops offset chunks that open a gap over the maximum', () => {
        expect(
            getStreamingChunkInstruction(
                { value: 'Hello', offset: STREAM_MAX_OFFSET_GAP + 1 },
                null
            )
        ).toEqual({
            kind: 'drop',
            message:
                `offset chunk skipped: offset ${STREAM_MAX_OFFSET_GAP + 1} is more than ` +
                `${STREAM_MAX_OFFSET_GAP} chars beyond the current buffer length (0).`
        })
    })

    it('allows offset chunks exactly at the maximum gap boundary', () => {
        const chunk = { value: 'Hello', offset: STREAM_MAX_OFFSET_GAP + 5 }

        expect(
            getStreamingChunkInstruction(chunk, null, {
                currentBufferLength: 5
            })
        ).toEqual({
            kind: 'offset',
            chunk,
            nextMode: 'offset'
        })
    })

    it('keeps mode-mismatch warnings ahead of excessive-gap warnings', () => {
        expect(
            getStreamingChunkInstruction(
                { value: 'Hello', offset: STREAM_MAX_OFFSET_GAP + 1 },
                'append'
            )
        ).toEqual({
            kind: 'drop',
            message:
                'append mode active, offset chunk dropped. Call resetStream() before switching streaming input modes.'
        })
    })

    it('keeps invalid-offset warnings ahead of excessive-gap warnings', () => {
        expect(
            getStreamingChunkInstruction(
                { value: 'Hello', offset: Number.MAX_SAFE_INTEGER + 1 },
                null
            )
        ).toEqual({
            kind: 'drop',
            message:
                'Invalid offset chunk passed to writeChunk(); offset must be a non-negative safe integer.'
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

    it('clamps direct offset padding to the maximum gap', () => {
        expect(
            applyStreamingOffsetChunk(
                'ab',
                {
                    value: 'XY',
                    offset: 100
                },
                { maxOffsetGap: 3 }
            )
        ).toBe('ab   XY')
    })
})

describe('offset stream restart detection', () => {
    it('flags an offset-0 chunk that diverges from the buffered content', () => {
        expect(isOffsetStreamRestart('Old stream tail text', { value: 'New', offset: 0 })).toBe(
            true
        )
    })

    it('does not flag an idempotent replay of the buffered prefix', () => {
        expect(isOffsetStreamRestart('Hello World', { value: 'Hello', offset: 0 })).toBe(false)
    })

    it('does not flag a cumulative snapshot that extends the buffer', () => {
        expect(isOffsetStreamRestart('Hello', { value: 'Hello World', offset: 0 })).toBe(false)
    })

    it('does not flag a gap fill into whitespace padding', () => {
        // Out-of-order delivery: a later chunk opened a padded gap, then the
        // offset-0 chunk arrives to fill it.
        expect(isOffsetStreamRestart('    tail', { value: 'head', offset: 0 })).toBe(false)
    })

    it('does not flag chunks written past offset 0', () => {
        expect(isOffsetStreamRestart('Hello World', { value: 'XXX', offset: 6 })).toBe(false)
    })

    it('does not flag writes into an empty buffer', () => {
        expect(isOffsetStreamRestart('', { value: 'Hello', offset: 0 })).toBe(false)
    })

    it('does not flag empty chunk values', () => {
        expect(isOffsetStreamRestart('Hello', { value: '', offset: 0 })).toBe(false)
    })

    it('returns a restart instruction when currentBuffer is provided and diverges', () => {
        const chunk = { value: 'New stream', offset: 0 }

        expect(
            getStreamingChunkInstruction(chunk, 'offset', { currentBuffer: 'Old stream' })
        ).toEqual({
            kind: 'restart',
            chunk,
            nextMode: 'offset',
            message:
                'offset chunk at 0 diverges from the buffered stream; treating it as a new ' +
                'stream and resetting. Call resetStream() (or set the streamId prop) when ' +
                'starting a new stream to avoid this fallback.'
        })
    })

    it('keeps plain offset instructions when currentBuffer is not provided', () => {
        const chunk = { value: 'New stream', offset: 0 }

        expect(getStreamingChunkInstruction(chunk, 'offset', { currentBufferLength: 10 })).toEqual({
            kind: 'offset',
            chunk,
            nextMode: 'offset'
        })
    })

    it('derives the gap check from currentBuffer when provided', () => {
        expect(
            getStreamingChunkInstruction(
                { value: 'Hello', offset: STREAM_MAX_OFFSET_GAP + 1 },
                'offset',
                { currentBuffer: '' }
            )
        ).toEqual({
            kind: 'drop',
            message:
                `offset chunk skipped: offset ${STREAM_MAX_OFFSET_GAP + 1} is more than ` +
                `${STREAM_MAX_OFFSET_GAP} chars beyond the current buffer length (0).`
        })
    })
})
