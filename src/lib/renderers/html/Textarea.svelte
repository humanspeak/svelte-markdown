<!--
@component
Renders an HTML `<textarea>` element. Accepts optional attributes and child content.
-->
<script lang="ts">
    interface Props {
        attributes?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    const { attributes }: Props = $props()
</script>

<textarea {...attributes}></textarea>
