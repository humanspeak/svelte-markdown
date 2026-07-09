import type { StreamingChunk, StreamingOffsetChunk } from '$lib/types.js'

export const STREAM_BATCH_FALLBACK_MS = 16
export const STREAM_BATCH_MAX_CHARS = 256
// Largest gap an offset chunk may open before it is treated as malformed.
export const STREAM_MAX_OFFSET_GAP = 1_000_000

export type StreamingInputMode = 'append' | 'offset' | null

export type StreamingChunkInstruction =
    | { kind: 'append'; value: string; nextMode: 'append' }
    | { kind: 'offset'; chunk: StreamingOffsetChunk; nextMode: 'offset' }
    | { kind: 'restart'; chunk: StreamingOffsetChunk; nextMode: 'offset'; message: string }
    | { kind: 'drop'; message: string }

export interface StreamingChunkInstructionOptions {
    currentBufferLength?: number
    /**
     * The current accumulated stream buffer. When provided, offset chunks
     * written at offset 0 are checked for divergence against the buffered
     * content so a forgotten `resetStream()` between streams surfaces as a
     * `restart` instruction instead of silently leaving the previous
     * stream's tail in place.
     */
    currentBuffer?: string
    maxOffsetGap?: number
}

export interface ApplyStreamingOffsetChunkOptions {
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

/**
 * Detects an offset-mode stream restart: a chunk written at offset 0 whose
 * content diverges from what the buffer already holds at that position.
 *
 * A producer that starts a NEW stream without the consumer calling
 * `resetStream()` begins again at offset 0. `applyStreamingOffsetChunk`
 * would overwrite the prefix but keep the previous stream's tail beyond the
 * chunk's length — rendering interleaved old/new content with zero warning.
 *
 * Deliberately conservative — the following are NOT restarts:
 * - Idempotent replays and cumulative snapshots (`value` extends the
 *   buffered prefix) — common with resumed/multiplexed streams.
 * - Gap fills into whitespace padding (an out-of-order offset-0 chunk
 *   arriving after later chunks opened a padded gap).
 *
 * @param buffer Current accumulated stream buffer.
 * @param chunk Offset chunk being written.
 * @returns True when the chunk should be treated as the start of a new stream.
 */
export const isOffsetStreamRestart = (buffer: string, chunk: StreamingOffsetChunk): boolean => {
    if (chunk.offset !== 0 || buffer === '' || chunk.value === '') return false
    const overlap = buffer.slice(0, Math.min(buffer.length, chunk.value.length))
    if (chunk.value.startsWith(overlap)) return false
    if (overlap.trim() === '') return false
    return true
}

export const getStreamingChunkInstruction = (
    chunk: StreamingChunk,
    currentMode: StreamingInputMode,
    {
        currentBufferLength = 0,
        currentBuffer,
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

    const bufferLength = currentBuffer !== undefined ? currentBuffer.length : currentBufferLength

    if (chunk.offset - bufferLength > maxOffsetGap) {
        return {
            kind: 'drop',
            message:
                `offset chunk skipped: offset ${chunk.offset} is more than ` +
                `${maxOffsetGap} chars beyond the current buffer length ` +
                `(${bufferLength}).`
        }
    }

    if (currentBuffer !== undefined && isOffsetStreamRestart(currentBuffer, chunk)) {
        return {
            kind: 'restart',
            chunk,
            nextMode: 'offset',
            message:
                'offset chunk at 0 diverges from the buffered stream; treating it as a new ' +
                'stream and resetting. Call resetStream() (or set the streamId prop) when ' +
                'starting a new stream to avoid this fallback.'
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
    { value, offset }: StreamingOffsetChunk,
    { maxOffsetGap = STREAM_MAX_OFFSET_GAP }: ApplyStreamingOffsetChunkOptions = {}
) => {
    const gap = Math.max(0, offset - source.length)
    const boundedGap = Math.min(gap, Math.max(0, maxOffsetGap))
    const effectiveOffset = offset > source.length ? source.length + boundedGap : offset
    const padded = boundedGap > 0 ? source + ' '.repeat(boundedGap) : source
    const prefix = padded.slice(0, effectiveOffset)
    const suffix = padded.slice(effectiveOffset + value.length)

    return prefix + value + suffix
}
