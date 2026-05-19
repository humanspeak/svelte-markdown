<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
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

<ExampleV2
    figId="FIG-001"
    tag="PERFORMANCE"
    title={{ prefix: 'caching ', accent: 'performance', end: '.' }}
    description="Token caching gives 50–200× speedups on repeat renders. Toggle the LRU cache and watch the render budget collapse."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/CachingPerformance.svelte"
>
    <CachingPerformance />
</ExampleV2>
