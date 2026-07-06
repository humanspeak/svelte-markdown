<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        text?: string
        children?: Snippet
    }

    const { text = undefined, children }: Props = $props()
</script>

<li data-tracked-list-item={text}>{@render children?.()}</li>
