<script lang="ts">
    import { type Snippet } from 'svelte'
    import { type BreadcrumbContext } from '$lib/components/contexts/Breadcrumb/type'
    import { setBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'

    // Props using Svelte 5 $props typing
    const { children } = $props<{
        children?: Snippet
    }>()

    // Store of breadcrumbs shared via context
    const breadcrumbs = $state<BreadcrumbContext>({ breadcrumbs: [] })

    // Expose a typed API in context so pages can mutate breadcrumbs
    setBreadcrumbContext(breadcrumbs)
</script>

{@render children?.()}
