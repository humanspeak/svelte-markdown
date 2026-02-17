<!--
@component
Renders an HTML `<textarea>` element. Accepts optional attributes and child content.
-->
<script lang="ts">
    interface Props {
        attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const { attributes }: Props = $props()
</script>

<textarea {...attributes}></textarea>
