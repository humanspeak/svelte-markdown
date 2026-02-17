<!--
@component
Renders an HTML `<table>` element. Accepts optional attributes and child content.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        attributes?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    const { children, attributes }: Props = $props()
</script>

<table {...attributes}>{@render children?.()}</table>
