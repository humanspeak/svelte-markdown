<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import BasicCache from '$lib/examples/BasicCache.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Basic Cache' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Basic Cache | Examples | Memory Cache'
        seo.description =
            'Interactive demo of basic memory cache operations in TypeScript. Try get, set, and delete with a live visual cache state powered by @humanspeak/memory-cache.'
    }
</script>

<Example title="Basic Cache">
    <BasicCache />
</Example>
