import type { MotionSpan } from '@humanspeak/svelte-motion'
import type { ComponentProps, Snippet } from 'svelte'
import type {
    StreamingTextGranularity,
    StreamingTextMetadata,
    StreamingTextSegment,
    StreamingTextSegmenter
} from '../../types.js'
type MotionProps = ComponentProps<typeof MotionSpan>
export interface StreamingMotionProps {
    text?: string
    streamingText?: StreamingTextMetadata
    enabled?: boolean
    animateRevisions?: boolean
    animateInitialContent?: boolean
    initial?: MotionProps['initial']
    animate?: MotionProps['animate']
    transition?: MotionProps['transition']
    variants?: MotionProps['variants']
    custom?: MotionProps['custom']
    locale?: string
    segmenter?: StreamingTextSegmenter
    segment?: Snippet<[StreamingTextSegment]>
    /**
     * Feathered left-to-right mask reveal on arriving segments. On by default
     * for FadeWords and RiseWords, off for FadeCharacters. Pass `false` to
     * disable or `{ duration }` (seconds, default 0.8) to retime it.
     */
    ink?: boolean | { duration?: number }
}
export interface MotionTextProps extends StreamingMotionProps {
    granularity: StreamingTextGranularity
    preset: 'fade-words' | 'rise-words' | 'fade-characters'
}
export interface StreamingFadeProps {
    streamingText?: StreamingTextMetadata
    enabled?: boolean
    /** Render a block wrapper (`div`) instead of an inline `span`. */
    block?: boolean
    animateRevisions?: boolean
    animateInitialContent?: boolean
    initial?: MotionProps['initial']
    animate?: MotionProps['animate']
    transition?: MotionProps['transition']
    children?: Snippet
}
