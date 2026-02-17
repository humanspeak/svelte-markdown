<!--
@component
Renders a markdown text token by rendering its child content.
-->
<script lang="ts">
    import { type Snippet } from 'svelte'

    interface Props {
        children?: Snippet
    }

    const { children }: Props = $props()
</script>

{@render children?.()}
