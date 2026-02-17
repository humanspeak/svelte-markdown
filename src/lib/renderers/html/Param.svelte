<!--
@component
Renders a self-closing HTML `<param>` element. Accepts optional attributes.
-->
<script lang="ts">
    interface Props {
        attributes?: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
    }

    const { attributes }: Props = $props()
</script>

<param {...attributes} />
