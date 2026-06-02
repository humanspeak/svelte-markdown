import type { StreamingChunk, StreamingOffsetChunk } from '$lib/types.js'

/**
 * Checks whether a streaming chunk uses offset-based patching.
 *
 * @param chunk Streaming chunk passed to the imperative streaming API.
 * @returns True when the chunk has an `offset` field.
 */
export const isStreamingOffsetChunk = (chunk: StreamingChunk): chunk is StreamingOffsetChunk =>
    typeof chunk === 'object' && chunk !== null && 'offset' in chunk
