<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import CachingBenchmark from '$lib/examples/caching-performance/demos/CachingBenchmark.svelte'
    import { Gauge, Recycle, Zap } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Caching Performance | Examples | Svelte Markdown'
        seo.description =
            'Explore the built-in LRU TokenCache in @humanspeak/svelte-markdown — measure cold vs warm render times, watch the cache size grow, and see the 50–200× speedup on repeat renders.'
        seo.ogTitle = 'Caching Performance'
        seo.ogTagline = 'Measure the LRU token cache live — cold render vs cached render.'
        seo.ogFeatures = ['LRU Cache', '50–200× Speedup', 'Live Metrics', 'Render Log']
        seo.ogSlug = 'examples-caching-performance'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'BENCHMARK',
            title: { prefix: 'token cache ', accent: 'benchmark', end: '.' },
            description:
                'Render the same markdown once cold, once warm. The render log records every cycle; the stats card surfaces average time and cache size. Clear the cache to start the comparison over.',
            snippet: benchmarkSection,
            codeSnippet: benchmarkCode,
            notes: benchmarkNotes,
            barCells: [{ k: 'cache', v: 'lru 50d / 5m' }],
            sourceUrl: `${SOURCE_URL}caching-performance/demos/CachingBenchmark.svelte`
        }
    ]
</script>

{#snippet benchmarkSection()}
    <CachingBenchmark />
{/snippet}

{#snippet benchmarkNotes()}
    <ul>
        <li>
            <Zap />
            <span>First render parses markdown into tokens and stores them in an LRU cache.</span>
        </li>
        <li>
            <Gauge />
            <span>
                Subsequent renders of the same content skip parsing and use cached tokens (50–200×
                faster).
            </span>
        </li>
        <li>
            <Recycle />
            <span>LRU eviction and TTL expiration manage memory automatically.</span>
        </li>
    </ul>
{/snippet}

{#snippet benchmarkCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'caching-performance/demos/CachingBenchmark.svelte',
                'caching-benchmark',
                'CachingBenchmark.svelte'
            )
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2
        figId={section.figId}
        tag={section.tag}
        title={section.title}
        description={section.description}
        mode={section.mode ?? 'live'}
        sheetLabel={formatSheetLabel(i, sections.length)}
        barCells={section.barCells}
        sourceUrl={section.sourceUrl}
        codeSnippet={section.codeSnippet}
        codeLabel="show code"
        notes={section.notes}
    >
        {@render section.snippet()}
    </ExampleV2>
{/each}
