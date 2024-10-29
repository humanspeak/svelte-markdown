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
