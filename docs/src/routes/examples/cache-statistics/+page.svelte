<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import CacheStatistics from '$lib/examples/CacheStatistics.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Cache Statistics' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Cache Statistics | Examples | Memory Cache'
        seo.description =
            'Monitor cache hit rate, miss rate, and overall performance in real-time. Interactive demo of built-in statistics tracking in @humanspeak/memory-cache.'
    }
</script>

<Example title="Cache Statistics">
    <CacheStatistics />
</Example>
