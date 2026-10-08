<script lang="ts">
    const { depth, raw, children } = $props<{
        depth: number
        raw: string
        children?: import('svelte').Snippet
    }>()
</script>

<div data-testid="custom-heading" data-depth={depth} data-raw={raw}>
    {@render children?.()}
</div>
