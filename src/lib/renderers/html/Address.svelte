<!--
@component
Renders an HTML `<address>` element. Accepts optional attributes and child content.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const { children, attributes }: Props = $props()
</script>

<address {...attributes}>{@render children?.()}</address>
