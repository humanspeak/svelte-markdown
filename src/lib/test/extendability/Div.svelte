<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const { children, attributes }: Props = $props()
</script>

<div data-markdown-test="data-markdown-test-div" {...attributes}>{@render children?.()}</div>
