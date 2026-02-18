<script lang="ts">
    import type { Snippet } from 'svelte'

    const { children }: { children?: Snippet } = $props()
</script>

<p data-testid="component-wins">{@render children?.()}</p>
