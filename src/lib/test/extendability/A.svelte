<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
        text?: string
    }

    const { children, attributes, text }: Props = $props()
</script>

<a data-markdown-test="data-markdown-test-a" {...attributes}>
    {#if children}
        {@render children?.()}
    {:else}
        {text}
    {/if}
</a>
