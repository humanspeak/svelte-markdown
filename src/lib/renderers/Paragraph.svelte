<!--
@component
Renders a markdown paragraph as a `<p>` element.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }
    const { children }: Props = $props()
</script>

<p>{@render children?.()}</p>
