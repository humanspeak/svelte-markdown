<!--
@component
Renders an HTML `<sup>` element. Accepts optional attributes and child content.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, unknown>
    }

    const { children, attributes }: Props = $props()
</script>

<sup {...attributes}>{@render children?.()}</sup>
