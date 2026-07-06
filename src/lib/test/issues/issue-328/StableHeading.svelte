<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        id?: string
        children?: Snippet
    }

    const { id = undefined, children }: Props = $props()
</script>

<h1 {id} data-stable-heading-id={id}>{@render children?.()}</h1>
