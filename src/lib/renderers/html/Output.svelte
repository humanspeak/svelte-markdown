<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, any>
    }

    const { children, attributes }: Props = $props()
</script>

<output {...attributes}>{@render children?.()}</output>
