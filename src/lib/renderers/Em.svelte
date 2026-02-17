<!--
@component
Renders markdown emphasis (`*text*` or `_text_`) as an `<em>` element.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }

    const { children }: Props = $props()
</script>

<em>{@render children?.()}</em>
