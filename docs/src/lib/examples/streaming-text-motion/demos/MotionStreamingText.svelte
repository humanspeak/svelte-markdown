<script lang="ts">
    import { StreamingText } from '@humanspeak/svelte-markdown'
    import type {
        StreamingTextMetadata,
        StreamingTextGranularity
    } from '@humanspeak/svelte-markdown'
    import { MotionSpan } from '@humanspeak/svelte-motion'

    const {
        text = '',
        streamingText,
        enabled = false,
        duration = 0.18,
        stagger = 0.02,
        granularity = 'word'
    }: {
        text?: string
        streamingText?: StreamingTextMetadata
        enabled?: boolean
        duration?: number
        stagger?: number
        granularity?: StreamingTextGranularity
    } = $props()
</script>

<StreamingText {text} metadata={streamingText} {granularity}>
    {#snippet segment(part)}
        {#if !enabled || part.isWhitespace}
            {part.text}
        {:else}
            <MotionSpan
                initial={part.isNew ? { opacity: 0 } : false}
                animate={{ opacity: 1 }}
                transition={{ duration, delay: Math.min(part.batchIndex * stagger, 0.16) }}
                >{part.text}</MotionSpan
            >
        {/if}
    {/snippet}
</StreamingText>
