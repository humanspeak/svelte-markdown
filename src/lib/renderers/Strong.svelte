<!--
@component
Renders markdown strong emphasis (`**text**` or `__text__`) as a `<strong>` element.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }
    const { children }: Props = $props()
</script>

<strong>{@render children?.()}</strong>
