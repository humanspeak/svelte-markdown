<!--
@component
Renders a single list item as an `<li>` element.

@prop {Snippet} [children] - Content of the list item.
@prop {number} [listItemIndex] - Zero-based index of this item within its parent list.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        listItemIndex?: number
    }

    // trunk-ignore(eslint/@typescript-eslint/no-unused-vars,eslint/no-unused-vars)
    const { children, listItemIndex = undefined }: Props = $props()
</script>

<li>{@render children?.()}</li>
