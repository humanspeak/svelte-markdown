<script lang="ts">
    import Markdown from './Markdown.svelte'
    import type { StreamingChunk } from '../../types.js'
    let streamId = $state('first')
    let markdown = $state<Markdown>()
    export function write(chunk: StreamingChunk) {
        markdown?.writeChunk(chunk)
    }
    export function switchAndWrite(chunk: StreamingChunk) {
        streamId = 'second'
        markdown?.writeChunk(chunk)
    }
</script>

<Markdown bind:this={markdown} {streamId} />
