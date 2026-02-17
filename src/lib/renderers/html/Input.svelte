<!--
@component
Renders a self-closing HTML `<input>` element. Accepts optional attributes.
-->
<script lang="ts">
    interface Props {
        attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const { attributes }: Props = $props()
</script>

<input {...attributes} />
