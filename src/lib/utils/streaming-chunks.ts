import type { StreamingChunk, StreamingOffsetChunk } from '$lib/types.js'

export const STREAM_BATCH_FALLBACK_MS = 16
export const STREAM_BATCH_MAX_CHARS = 256
// Largest gap an offset chunk may open before it is treated as malformed.
export const STREAM_MAX_OFFSET_GAP = 1_000_000

export type StreamingInputMode = 'append' | 'offset' | null

export type StreamingChunkInstruction =
    | { kind: 'append'; value: string; nextMode: 'append' }
    | { kind: 'offset'; chunk: StreamingOffsetChunk; nextMode: 'offset' }
    | { kind: 'drop'; message: string }

export interface StreamingChunkInstructionOptions {
    currentBufferLength?: number
    maxOffsetGap?: number
}

/**
 * Checks whether a streaming chunk uses offset-based patching.
 *
 * @param chunk Streaming chunk passed to the imperative streaming API.
 * @returns True when the chunk has an `offset` field.
 */
export const isStreamingOffsetChunk = (chunk: StreamingChunk): chunk is StreamingOffsetChunk =>
    typeof chunk === 'object' && chunk !== null && 'offset' in chunk

export const getStreamingChunkInstruction = (
    chunk: StreamingChunk,
    currentMode: StreamingInputMode,
    {
        currentBufferLength = 0,
        maxOffsetGap = STREAM_MAX_OFFSET_GAP
    }: StreamingChunkInstructionOptions = {}
): StreamingChunkInstruction => {
    if (typeof chunk === 'string') {
        if (currentMode === 'offset') {
            return {
                kind: 'drop',
                message:
                    'offset mode active, string chunk dropped. Call resetStream() before switching streaming input modes.'
            }
        }

        return { kind: 'append', value: chunk, nextMode: 'append' }
    }

    if (!isStreamingOffsetChunk(chunk) || typeof chunk.value !== 'string') {
        return {
            kind: 'drop',
            message:
                'Invalid chunk object passed to writeChunk(); expected { value: string, offset: number }.'
        }
    }

    if (!Number.isSafeInteger(chunk.offset) || chunk.offset < 0) {
        return {
            kind: 'drop',
            message:
                'Invalid offset chunk passed to writeChunk(); offset must be a non-negative safe integer.'
        }
    }

    if (currentMode === 'append') {
        return {
            kind: 'drop',
            message:
                'append mode active, offset chunk dropped. Call resetStream() before switching streaming input modes.'
        }
    }

    if (chunk.offset - currentBufferLength > maxOffsetGap) {
        return {
            kind: 'drop',
            message:
                `offset chunk skipped: offset ${chunk.offset} is more than ` +
                `${maxOffsetGap} chars beyond the current buffer length ` +
                `(${currentBufferLength}).`
        }
    }

    return { kind: 'offset', chunk, nextMode: 'offset' }
}

export const appendStreamingChunk = (pendingBuffer: string, value: string) => pendingBuffer + value

export const commitStreamingAppendBuffer = (sourceBuffer: string, pendingBuffer: string) => {
    if (pendingBuffer === '') {
        return { committed: false, sourceBuffer, pendingBuffer }
    }

    return {
        committed: true,
        sourceBuffer: sourceBuffer + pendingBuffer,
        pendingBuffer: ''
    }
}

export const shouldFlushStreamingAppendBuffer = (
    pendingBuffer: string,
    maxChars = STREAM_BATCH_MAX_CHARS
) => pendingBuffer.length >= maxChars

export const applyStreamingOffsetChunk = (
    source: string,
    { value, offset }: StreamingOffsetChunk
) => {
    const padded = offset > source.length ? source + ' '.repeat(offset - source.length) : source
    const prefix = padded.slice(0, offset)
    const suffix = padded.slice(offset + value.length)

    return prefix + value + suffix
}
