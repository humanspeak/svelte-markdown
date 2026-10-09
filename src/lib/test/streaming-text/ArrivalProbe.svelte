<script lang="ts">
    import { getContext, untrack } from 'svelte'
    import type { StreamingTextMetadata } from '../../types.js'
    import {
        STREAMING_TEXT_CONTEXT,
        type StreamingTextContext
    } from '../../utils/streaming-text-context.js'
    const {
        text,
        streamingText,
        onmount
    }: {
        text: string
        streamingText?: StreamingTextMetadata
        onmount?: (_mount: {
            text: string
            arrival: StreamingTextMetadata['arrival']
            batch: number | undefined
        }) => void
    } = $props()
    const context = getContext<StreamingTextContext | undefined>(STREAMING_TEXT_CONTEXT)
    untrack(() => onmount?.({ text, arrival: streamingText?.arrival, batch: context?.getBatch() }))
</script>

<span data-math={text}>{text}</span>
