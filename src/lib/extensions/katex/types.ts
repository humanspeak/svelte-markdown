import type { Snippet } from 'svelte'
import type { StreamingTextMetadata } from '../../types.js'

/** Props passed to snippets for tokens emitted by `markedKatex`. */
export interface KatexSnippetProps {
    /** The math expression to render. */
    text: string
    /** Whether the token is display math rather than inline math. */
    displayMode: boolean
    /** Arrival metadata when streaming text tracking is enabled. */
    streamingText?: StreamingTextMetadata
}

/** Add to wrapper props to forward the built-in KaTeX snippet overrides. */
export type KatexSnippetOverrides = {
    inlineKatex?: Snippet<[KatexSnippetProps]>
    blockKatex?: Snippet<[KatexSnippetProps]>
}
