<!--
@component
Renders a table cell as either `<th>` (header) or `<td>` (data), with optional
text alignment applied as an inline `text-align` style.

@prop {boolean} header - When `true`, renders a `<th>`; otherwise renders a `<td>`.
@prop {'left'|'center'|'right'|'justify'|'char'|null|undefined} align - Column alignment.
@prop {Snippet} [children] - Cell content.
-->
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
