<script lang="ts">
    interface Props {
        attributes?: Record<string, any>
    }

    const { attributes }: Props = $props()
</script>

<embed {...attributes} />
