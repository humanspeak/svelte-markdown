<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import DefaultRendering from '$lib/examples/snippet-overrides/demos/DefaultRendering.svelte'
    import WithSnippets from '$lib/examples/snippet-overrides/demos/WithSnippets.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Snippet Overrides | Examples | Svelte Markdown'
        seo.description =
            'Two renderings for @humanspeak/svelte-markdown — default output vs inline Svelte 5 snippet overrides customizing paragraphs, headings, links, blockquotes, list items, code blocks, and table cells.'
        seo.ogTitle = 'Snippet Overrides'
        seo.ogTagline = 'Default vs snippet-customized rendering — same source, two looks.'
        seo.ogFeatures = ['Default Rendering', 'Snippet Overrides', 'Svelte 5 Snippets']
        seo.ogSlug = 'examples-snippet-overrides'
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
            title: { prefix: 'default ', accent: 'rendering', end: '.' },
            description:
                'No overrides. Every markdown element falls through to its built-in renderer — clean baseline for comparison.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            barCells: [{ k: 'overrides', v: 'none' }],
            sourceUrl: `${SOURCE_URL}snippet-overrides/demos/DefaultRendering.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'SNIPPETS',
            title: { prefix: 'snippet ', accent: 'overrides', end: '.' },
            description:
                'Inline Svelte 5 snippets customize paragraphs, headings, links, blockquotes, list items, code blocks, and table cells — all in one template, no separate component files.',
            snippet: snippetsSection,
            codeSnippet: snippetsCode,
            barCells: [{ k: 'overrides', v: 'inline snippets' }],
            sourceUrl: `${SOURCE_URL}snippet-overrides/demos/WithSnippets.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet defaultSection()}
    <DefaultRendering />
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'default-rendering',
                label: 'DefaultRendering.svelte',
                ...manifest['snippet-overrides/demos/DefaultRendering.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#snippet snippetsSection()}
    <WithSnippets />
{/snippet}
{#snippet snippetsCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'with-snippets',
                label: 'WithSnippets.svelte',
                ...manifest['snippet-overrides/demos/WithSnippets.svelte']
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
