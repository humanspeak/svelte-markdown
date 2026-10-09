<script lang="ts">
    import SvelteMarkdown from '../../SvelteMarkdown.svelte'
    import ArrivalProbe from './ArrivalProbe.svelte'
    import type { ComponentProps } from 'svelte'
    import type { SvelteMarkdownProps, StreamingChunk, StreamingTextMetadata } from '../../types.js'
    type Mount = Parameters<NonNullable<ComponentProps<typeof ArrivalProbe>['onmount']>>[0]
    const {
        source = '',
        extensions = [],
        onmount
    }: Partial<SvelteMarkdownProps> & { onmount?: (_mount: Mount) => void } = $props()
    let markdown = $state<SvelteMarkdown>()
    export function writeChunk(chunk: StreamingChunk) {
        markdown?.writeChunk(chunk)
    }
</script>

<SvelteMarkdown bind:this={markdown} {source} streaming streamingText {extensions}>
    {#snippet inlineMath({
        text,
        streamingText
    }: {
        text: string
        streamingText?: StreamingTextMetadata
    })}<ArrivalProbe {text} {streamingText} {onmount} />{/snippet}
</SvelteMarkdown>
