<script lang="ts">
    import type { Snippet } from 'svelte'

    const { children }: { children?: Snippet } = $props()
</script>

<button data-testid="custom-tag-component">{@render children?.()}</button>
