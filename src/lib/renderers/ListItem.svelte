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
