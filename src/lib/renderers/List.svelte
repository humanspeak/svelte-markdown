<!--
@component
Renders a markdown list as either an `<ol>` (ordered) or `<ul>` (unordered) element.

@prop {boolean} [ordered=false] - When `true`, renders an ordered `<ol>` list.
@prop {number} [start=1] - Starting number for ordered lists (the `start` attribute).
@prop {Snippet} [children] - List item content.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        ordered?: boolean
        start?: number
        children?: Snippet
    }

    const { ordered = false, start = 1, children }: Props = $props()
</script>

{#if ordered}
    <ol {start}>{@render children?.()}</ol>
{:else}
    <ul>{@render children?.()}</ul>
{/if}
