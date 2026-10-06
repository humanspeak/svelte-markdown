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
}
export interface MotionTextProps extends StreamingMotionProps {
    granularity: StreamingTextGranularity
    rise?: boolean
}
