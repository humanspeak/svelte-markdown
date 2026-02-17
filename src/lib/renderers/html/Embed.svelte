<!--
@component
Renders a self-closing HTML `<embed>` element. Accepts optional attributes.
-->
<script lang="ts">
    interface Props {
        attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const { attributes }: Props = $props()
</script>

<embed {...attributes} />
