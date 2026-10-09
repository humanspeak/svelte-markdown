<script lang="ts">
    const { attributes = {}, children } = $props<{
        attributes?: Record<string, string>
        children?: import('svelte').Snippet
    }>()

    const start = $derived(Number(attributes.start ?? 0))
    let clicks = $state(0)
    const count = $derived(start + clicks)
</script>

<button data-testid="counter" data-start={attributes.start} onclick={() => clicks++}>
    count: {count} / label: {@render children?.()}
</button>
