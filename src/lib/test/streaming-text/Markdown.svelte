<script lang="ts">
    import SvelteMarkdown from '../../SvelteMarkdown.svelte'
    import StreamingText from '../../StreamingText.svelte'
    import Segments from './Segments.svelte'
    import type {
        SvelteMarkdownProps,
        StreamingChunk,
        StreamingTextGranularity
    } from '../../types.js'
    const {
        source = '',
        streaming = true,
        streamingText = true,
        streamId,
        component = false,
        granularity = 'word',
        extensions = []
    }: Partial<SvelteMarkdownProps> & {
        component?: boolean
        granularity?: StreamingTextGranularity
    } = $props()
    let markdown = $state<SvelteMarkdown>()
    export function writeChunk(chunk: StreamingChunk) {
        markdown?.writeChunk(chunk)
    }
    export function resetStream(seed = '') {
        markdown?.resetStream(seed)
    }
</script>

{#if component}
    <SvelteMarkdown
        bind:this={markdown}
        {source}
        {streaming}
        {streamingText}
        {streamId}
        {extensions}
        renderers={{ rawtext: Segments }}
    />
{:else}
    <SvelteMarkdown
        bind:this={markdown}
        {source}
        {streaming}
        {streamingText}
        {streamId}
        {extensions}
    >
        {#snippet rawtext({ text, streamingText: metadata })}
            <StreamingText {text} {metadata} {granularity}>
                {#snippet segment(part)}
                    <span
                        data-id={part.id}
                        data-new={part.isNew}
                        data-change={part.change}
                        data-batch={part.batchId}
                        data-index={part.batchIndex}
                        data-provenance={metadata?.provenance}>{part.text}</span
                    >
                {/snippet}
            </StreamingText>
        {/snippet}
    </SvelteMarkdown>
{/if}
