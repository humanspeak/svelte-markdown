<!--
@component
Renders a markdown line break as a `<br />` element.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }
    const { children }: Props = $props()
</script>

<br />{@render children?.()}
