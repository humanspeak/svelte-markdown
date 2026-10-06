<script lang="ts">
    import StreamingText from '../../StreamingText.svelte'
    import type { StreamingTextProps, StreamingTextMetadata } from '../../types.js'
    const {
        text = '',
        metadata,
        streamingText,
        granularity,
        locale,
        segmenter
    }: StreamingTextProps & { streamingText?: StreamingTextMetadata } = $props()
</script>

<StreamingText {text} metadata={metadata ?? streamingText} {granularity} {locale} {segmenter}>
    {#snippet segment(part)}
        <span
            data-id={part.id}
            data-new={part.isNew}
            data-change={part.change}
            data-batch={part.batchId}
            data-index={part.batchIndex}>{part.text}</span
        >
    {/snippet}
</StreamingText>
