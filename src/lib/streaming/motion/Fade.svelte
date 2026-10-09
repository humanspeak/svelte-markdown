<!--
@component
Fades a whole custom renderer (for example extension math) in when its token
arrives mid-stream. Arrival is decided once at mount from source identity, so
re-mounts of content already revealed (a paragraph becoming a heading, a
refresh) render without an entrance.
-->
<script lang="ts">
    import { MotionDiv, MotionSpan } from '@humanspeak/svelte-motion'
    import { getContext, untrack } from 'svelte'
    import {
        STREAMING_TEXT_CONTEXT,
        type StreamingTextContext
    } from '../../utils/streaming-text-context.js'
    import type { StreamingFadeProps } from './types.js'
    const {
        streamingText,
        enabled = true,
        block = false,
        animateRevisions = false,
        animateInitialContent = false,
        initial,
        animate,
        transition,
        children
    }: StreamingFadeProps = $props()
    const context = getContext<StreamingTextContext | undefined>(STREAMING_TEXT_CONTEXT)
    const enters = untrack(() => {
        const arrival = streamingText?.arrival
        if (!enabled || !arrival) return false
        const isNew =
            arrival.change === 'append' &&
            !arrival.revealedBeforeBatch &&
            arrival.batchId === (context?.getBatch() ?? streamingText.renderBatchId)
        return (
            isNew ||
            (animateRevisions && arrival.change === 'revision') ||
            (animateInitialContent && arrival.change === 'baseline')
        )
    })
    const motion = $derived({
        initial: enters ? (initial ?? { opacity: 0 }) : (false as const),
        animate: animate ?? { opacity: 1 },
        transition: transition ?? { duration: 0.65, ease: 'linear' as const }
    })
</script>

{#if block}
    <MotionDiv {...motion}>{@render children?.()}</MotionDiv>
{:else}
    <MotionSpan {...motion}>{@render children?.()}</MotionSpan>
{/if}
