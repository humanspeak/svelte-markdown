<script lang="ts">
    import { MotionSpan } from '@humanspeak/svelte-motion'
    import StreamingText from '../../StreamingText.svelte'
    import InkWipe from './InkWipe.svelte'
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
        segment: renderSegment,
        granularity,
        preset,
        ink = false
    }: MotionTextProps = $props()
    const rise = $derived(preset === 'rise-words')
    const inkDuration = $derived(
        ink === false ? undefined : ink === true ? 0.8 : (ink.duration ?? 0.8)
    )
    const stagger = (batchIndex: number) => Math.min(batchIndex * 0.02, 0.16)
    function defaultTransition(delay: number) {
        if (preset === 'fade-characters') return { duration: 0.18, delay }
        const opacity = { duration: 0.65, ease: 'linear' as const, delay }
        return rise ? { opacity, y: { duration: 0.4, ease: 'easeOut' as const, delay } } : opacity
    }
</script>

{#if enabled}
    <StreamingText {text} metadata={streamingText} {granularity} {locale} {segmenter}>
        {#snippet segment(part)}
            {#if renderSegment}
                {@render renderSegment(part)}
            {:else if part.isWhitespace}
                {part.text}
            {:else}
                {@const enters =
                    part.isNew ||
                    (animateRevisions && part.change === 'revision') ||
                    (animateInitialContent && part.change === 'baseline')}
                {@const motion = {
                    initial: enters
                        ? (initial ?? (rise ? { opacity: 0, y: 8 } : { opacity: 0 }))
                        : false,
                    animate: animate ?? (rise ? { opacity: 1, y: 0 } : { opacity: 1 }),
                    transition: transition ?? defaultTransition(stagger(part.batchIndex)),
                    variants,
                    custom
                }}
                {#if inkDuration === undefined}
                    <MotionSpan {...motion} style={rise ? { display: 'inline-block' } : undefined}
                        >{part.text}</MotionSpan
                    >
                {:else}
                    <InkWipe isNew={enters} duration={inkDuration} delay={stagger(part.batchIndex)}
                        ><MotionSpan
                            {...motion}
                            style={rise ? { display: 'inline-block' } : undefined}
                            >{part.text}</MotionSpan
                        ></InkWipe
                    >
                {/if}
            {/if}
        {/snippet}
    </StreamingText>
{:else}
    {text}
{/if}
