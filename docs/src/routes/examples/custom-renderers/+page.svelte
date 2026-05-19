<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import DefaultRenderers from '$lib/examples/custom-renderers/demos/DefaultRenderers.svelte'
    import FilteredRenderers from '$lib/examples/custom-renderers/demos/FilteredRenderers.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Custom Renderers | Examples | Svelte Markdown'
        seo.description =
            'Two renderer policies for @humanspeak/svelte-markdown — see the same markdown rendered with the default renderer set vs an allow-list via allowRenderersOnly.'
        seo.ogTitle = 'Custom Renderers'
        seo.ogTagline = 'Default vs filtered renderers — side by side.'
        seo.ogFeatures = ['Default Renderers', 'Filtered Renderers', 'allowRenderersOnly']
        seo.ogSlug = 'examples-custom-renderers'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'

    type Section = {
        figId: string
        tag: string
        title: { prefix?: string; accent: string; end?: string }
        description: string
        snippet: Snippet
        codeSnippet?: Snippet
        mode?: 'live' | 'static'
        barCells?: { k: string; v: string }[]
        sourceUrl?: string
    }

    type ManifestEntry = {
        code: string
        lang: string
        html?: { light: string; dark: string }
    }
    const manifest = demoManifest as Record<string, ManifestEntry>

    const sections: Section[] = [
        {
            figId: 'FIG-001',
            tag: 'DEFAULT',
            title: { prefix: 'default ', accent: 'renderers', end: '.' },
            description:
                'No renderer override — every built-in lights up. Headings, paragraphs, lists, code blocks, tables, blockquotes, and horizontal rules all render normally.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            barCells: [{ k: 'renderers', v: 'all built-ins' }],
            sourceUrl: `${SOURCE_URL}custom-renderers/demos/DefaultRenderers.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'FILTERED',
            title: { prefix: 'filtered ', accent: 'renderers', end: '.' },
            description:
                'allowRenderersOnly whitelists a tight set of formatting renderers. Code blocks, tables, blockquotes, and horizontal rules drop entirely from the same markdown source.',
            snippet: filteredSection,
            codeSnippet: filteredCode,
            barCells: [{ k: 'renderers', v: 'allow-list' }],
            sourceUrl: `${SOURCE_URL}custom-renderers/demos/FilteredRenderers.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet defaultSection()}
    <DefaultRenderers />
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'default-renderers',
                label: 'DefaultRenderers.svelte',
                ...manifest['custom-renderers/demos/DefaultRenderers.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#snippet filteredSection()}
    <FilteredRenderers />
{/snippet}
{#snippet filteredCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'filtered-renderers',
                label: 'FilteredRenderers.svelte',
                ...manifest['custom-renderers/demos/FilteredRenderers.svelte']
            }
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
        sheetLabel="SHEET {pad2(i + 1)} / {pad2(sections.length)}"
        barCells={section.barCells}
        sourceUrl={section.sourceUrl}
        codeSnippet={section.codeSnippet}
        codeLabel="show code"
    >
        {@render section.snippet()}
    </ExampleV2>
{/each}
