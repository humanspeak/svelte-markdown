<script lang="ts">
    import { getContext } from 'svelte'
    import type { StreamingTextProps } from './types.js'
    import { StreamingTextSegments } from './utils/streaming-text.js'
    import {
        STREAMING_TEXT_CONTEXT,
        type StreamingTextContext
    } from './utils/streaming-text-context.js'
    const {
        text = '',
        metadata,
        granularity = 'word',
        locale,
        segmenter,
        segment
    }: StreamingTextProps = $props()
    const context = getContext<StreamingTextContext | undefined>(STREAMING_TEXT_CONTEXT)
    const reconciler = new StreamingTextSegments()
    const parts = $derived(
        segment
            ? reconciler.update(
                  text,
                  metadata,
                  granularity,
                  locale,
                  segmenter,
                  context?.getBatch() ?? metadata?.renderBatchId
              )
            : []
    )
</script>

{#if segment}
    {#each parts as part (part.id)}
        {@render segment(part)}
    {/each}
{:else}
    {text}
{/if}
