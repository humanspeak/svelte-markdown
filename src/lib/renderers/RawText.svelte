<!--
@component
Renders raw text content without any wrapping HTML element.
-->
<script lang="ts">
    interface Props {
        text?: string
    }
    const { text }: Props = $props()
</script>

{text}
