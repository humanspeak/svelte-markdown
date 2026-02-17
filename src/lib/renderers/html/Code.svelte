<!--
@component
Renders an HTML `<code>` element. Accepts optional attributes and child content.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const { children, attributes }: Props = $props()
</script>

<code {...attributes}>{@render children?.()}</code>
