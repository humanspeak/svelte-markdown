<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    const { children, attributes }: Props = $props()
</script>

<h1 data-markdown-test="data-markdown-test-h1" {...attributes}>{@render children?.()}</h1>
