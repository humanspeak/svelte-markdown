<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        header: boolean
        align: 'left' | 'center' | 'right' | 'justify' | 'char' | null | undefined
        children?: Snippet
    }

    const { header, align, children }: Props = $props()
</script>

{#if header}
    <th {align}>{@render children?.()}</th>
{:else}
    <td {align}>{@render children?.()}</td>
{/if}
