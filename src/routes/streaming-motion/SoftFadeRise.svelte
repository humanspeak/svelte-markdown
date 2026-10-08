<script lang="ts">
    import { MotionSpan } from '@humanspeak/svelte-motion'
    import { RiseWords } from '$lib/streaming/motion/index.js'
    import type { StreamingMotionProps } from '$lib/streaming/motion/types.js'
    import InkWipe from '$lib/streaming/motion/InkWipe.svelte'

    const {
        text,
        streamingText,
        enabled,
        lift,
        liftDuration,
        fadeDuration,
        ink = false,
        inkDuration = 0.6
    }: Pick<StreamingMotionProps, 'text' | 'streamingText' | 'enabled'> & {
        lift: number
        liftDuration: number
        fadeDuration: number
        ink?: boolean
        inkDuration?: number
    } = $props()
</script>

<RiseWords {text} {streamingText} {enabled}>
    {#snippet segment(part)}
        {#if part.isWhitespace}
            {part.text}
        {:else}
            {@const delay = Math.min(part.batchIndex * 0.02, 0.16)}
            {@const motion = {
                initial: part.isNew ? { opacity: 0, y: lift } : false,
                animate: { opacity: 1, y: 0 },
                transition: {
                    opacity: { duration: fadeDuration, ease: 'linear', delay },
                    y: { duration: liftDuration, ease: 'easeOut', delay }
                }
            } as const}
            {#if ink}
                <InkWipe isNew={part.isNew} duration={inkDuration} {delay}
                    ><MotionSpan {...motion} style={{ display: 'inline-block' }}
                        >{part.text}</MotionSpan
                    ></InkWipe
                >
            {:else}
                <MotionSpan {...motion} style={{ display: 'inline-block' }}>{part.text}</MotionSpan>
            {/if}
        {/if}
    {/snippet}
</RiseWords>
