<script lang="ts">
    import { MotionSpan } from '@humanspeak/svelte-motion'
    import { RiseWords } from '$lib/streaming/motion/index.js'
    import type { StreamingMotionProps } from '$lib/streaming/motion/types.js'

    const {
        text,
        streamingText,
        enabled,
        lift,
        liftDuration,
        fadeDuration
    }: Pick<StreamingMotionProps, 'text' | 'streamingText' | 'enabled'> & {
        lift: number
        liftDuration: number
        fadeDuration: number
    } = $props()
</script>

<RiseWords {text} {streamingText} {enabled}>
    {#snippet segment(part)}
        {#if part.isWhitespace}
            {part.text}
        {:else}
            <MotionSpan
                initial={part.isNew ? { opacity: 0, y: lift } : false}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    opacity: {
                        duration: fadeDuration,
                        ease: 'linear',
                        delay: Math.min(part.batchIndex * 0.02, 0.16)
                    },
                    y: {
                        duration: liftDuration,
                        ease: 'easeOut',
                        delay: Math.min(part.batchIndex * 0.02, 0.16)
                    }
                }}
                style={{ display: 'inline-block' }}>{part.text}</MotionSpan
            >
        {/if}
    {/snippet}
</RiseWords>
