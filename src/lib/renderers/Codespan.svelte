<!--
@component
Renders an inline code span (`` `code` ``) as a `<code>` element.
-->
<script lang="ts">
    interface Props {
        text: string
    }

    const { text }: Props = $props()
</script>

<code>{text}</code>
