<script lang="ts">
    import { MotionSpan } from '@humanspeak/svelte-motion'
    import StreamingText from '../../StreamingText.svelte'
    import type { MotionTextProps } from './types.js'
    const {
        text = '',
        streamingText,
        enabled = true,
        animateRevisions = false,
        animateInitialContent = false,
        initial,
        animate,
        transition,
        variants,
        custom,
        locale,
        segmenter,
        segment,
        granularity,
        rise = false
    }: MotionTextProps = $props()
</script>

{#if enabled}
    <StreamingText {text} metadata={streamingText} {granularity} {locale} {segmenter}>
        {#snippet segment(part)}
            {#if segment}
                {@render segment(part)}
            {:else if part.isWhitespace}
                {part.text}
            {:else}
                <MotionSpan
                    initial={part.isNew ||
                    (animateRevisions && part.change === 'revision') ||
                    (animateInitialContent && part.change === 'baseline')
                        ? (initial ?? (rise ? { opacity: 0, y: 6 } : { opacity: 0 }))
                        : false}
                    animate={animate ?? (rise ? { opacity: 1, y: 0 } : { opacity: 1 })}
                    transition={transition ?? {
                        duration: 0.18,
                        delay: Math.min(part.batchIndex * 0.02, 0.16)
                    }}
                    {variants}
                    {custom}
                    style={rise ? { display: 'inline-block' } : undefined}>{part.text}</MotionSpan
                >{/if}
        {/snippet}
    </StreamingText>
{:else}
    {text}
{/if}
