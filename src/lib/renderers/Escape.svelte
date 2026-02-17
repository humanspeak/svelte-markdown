<!--
@component
Renders a markdown escape sequence (e.g. `\*`) as plain text.
-->
<script lang="ts">
    interface Props {
        text?: string
    }
    const { text }: Props = $props()
</script>

{text}
