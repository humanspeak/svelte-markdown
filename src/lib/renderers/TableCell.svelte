<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        header: boolean
        align: 'left' | 'center' | 'right' | 'justify' | 'char' | null | undefined
        children?: Snippet
    }

    const { header, align, children }: Props = $props()

    // Convert alignment to style object if alignment is specified
    const style = $derived(align ? `text-align: ${align}` : undefined)
</script>

{#if header}
    <th {style}>{@render children?.()}</th>
{:else}
    <td {style}>{@render children?.()}</td>
{/if}
