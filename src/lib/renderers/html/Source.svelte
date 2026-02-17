<!--
@component
Renders a self-closing HTML `<source>` element. Accepts optional attributes.
-->
<script lang="ts">
    interface Props {
        attributes?: Record<string, any> // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    }

    const { attributes }: Props = $props()
</script>

<source {...attributes} />
