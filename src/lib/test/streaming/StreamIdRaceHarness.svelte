<!--
@component

Test harness that reproduces the same-tick `streamId` swap a real chat parent
performs: assign the new stream identity, then immediately call `writeChunk()`
for that stream's first chunk. Because Svelte 5 flushes effects in a microtask,
`writeChunk()` runs *before* the component's streaming `$effect` observes the
new `streamId` — so the reset must be reconciled inside `writeChunk()` itself.

`@testing-library/svelte`'s `rerender()` calls `flushSync`, which hides this
ordering; driving the prop from a real parent does not. The stream starts as
`msg-1`; call `switchStreamAndWrite()` to move it.
-->
<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { StreamingChunk } from '$lib/types.js'

    let streamId = $state('msg-1')
    let markdown = $state<
        | {
              writeChunk: (chunk: StreamingChunk) => void // trunk-ignore(eslint/no-unused-vars)
          }
        | undefined
    >()

    export const write = (chunk: StreamingChunk): void => {
        markdown?.writeChunk(chunk)
    }

    /** Swap the stream identity and write its first chunk without an intervening flush. */
    export const switchStreamAndWrite = (nextStreamId: string, chunk: StreamingChunk): void => {
        streamId = nextStreamId
        markdown?.writeChunk(chunk)
    }
</script>

<SvelteMarkdown bind:this={markdown} source="" streaming={true} {streamId} />
