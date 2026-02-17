<!--
@component
Renders a markdown blockquote (`>`) as a `<blockquote>` element.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }
    const { children }: Props = $props()
</script>

<blockquote>{@render children?.()}</blockquote>
