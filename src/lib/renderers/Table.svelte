<!--
@component
Renders a markdown table as a `<table>` element.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }
    const { children }: Props = $props()
</script>

<table>{@render children?.()}</table>
