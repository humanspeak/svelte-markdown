<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import CachingPerformance from '$lib/examples/CachingPerformance.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Caching Performance' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Caching Performance | Examples | Svelte Markdown'
        seo.description =
            'Explore token caching performance in @humanspeak/svelte-markdown. See the 50-200x speedup from built-in LRU caching.'
    }
</script>

<Example
    title="Caching Performance"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/CachingPerformance.svelte"
>
    <CachingPerformance />
</Example>
