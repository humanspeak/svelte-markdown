import type { StreamingTextMetadata } from '../types.js'
export const STREAMING_TEXT_CONTEXT = Symbol('svelte-markdown-streaming-text')
export interface StreamingTextContext {
    getBatch: () => number | undefined
    getMetadata: (_node: object) => StreamingTextMetadata | undefined
}
