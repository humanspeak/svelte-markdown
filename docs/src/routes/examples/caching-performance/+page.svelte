<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import CachingPerformance from '$lib/examples/CachingPerformance.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Caching Performance | Examples | Svelte Markdown'
        seo.description =
            'Explore token caching performance in @humanspeak/svelte-markdown. See the 50-200x speedup from built-in LRU caching.'
        seo.ogTitle = 'Caching Performance'
        seo.ogTagline = 'See the 50-200x speedup from LRU caching.'
        seo.ogFeatures = ['Benchmark', '50-200x Speed', 'LRU Cache', 'Real-Time Stats']
        seo.ogSlug = 'examples-caching-performance'
    }
</script>

<Example
    title="Caching Performance"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/CachingPerformance.svelte"
>
    <CachingPerformance />
</Example>
