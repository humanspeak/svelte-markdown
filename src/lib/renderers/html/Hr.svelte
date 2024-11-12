<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        attributes?: Record<string, any>
    }

    const { attributes }: Props = $props()
</script>

<hr {...attributes} />
