<script lang="ts">
    import { ComparisonPageV2, type CompareSlugLoadData } from '@humanspeak/docs-kit'
    import { competitors } from '$lib/compare-data'

    const { data }: { data: CompareSlugLoadData } = $props()
    const others = $derived(competitors.filter((c) => c.slug !== data.competitor.slug))
</script>

<ComparisonPageV2
    competitor={data.competitor}
    {others}
    ours={{
        name: 'Svelte Markdown',
        npmPackage: '@humanspeak/svelte-markdown',
        slug: 'svelte-markdown',
        url: 'https://markdown.svelte.page'
    }}
    getStartedHref="/docs/getting-started"
/>
