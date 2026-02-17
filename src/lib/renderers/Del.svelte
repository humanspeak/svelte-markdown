<!--
@component
Renders a markdown strikethrough (`~~text~~`) as a `<del>` element.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }
    const { children }: Props = $props()
</script>

<del>{@render children?.()}</del>
