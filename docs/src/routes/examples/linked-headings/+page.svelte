<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import DefaultHeadings from '$lib/examples/linked-headings/demos/DefaultHeadings.svelte'
    import RendererHeadings from '$lib/examples/linked-headings/demos/RendererHeadings.svelte'
    import SnippetHeadings from '$lib/examples/linked-headings/demos/SnippetHeadings.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Linked Headings | Examples | Svelte Markdown'
        seo.description =
            'Three ways to add clickable anchor links to markdown headings with @humanspeak/svelte-markdown — default rendering, a dedicated heading component, and an inline Svelte 5 snippet.'
        seo.ogTitle = 'Linked Headings'
        seo.ogTagline = 'Default vs custom-renderer vs snippet — three takes on heading anchors.'
        seo.ogFeatures = ['Default Headings', 'Custom Renderer', 'Snippet Override']
        seo.ogSlug = 'examples-linked-headings'
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
            title: { prefix: 'default ', accent: 'headings', end: '.' },
            description:
                'Stock headings — each gets an `id` derived from its text (so `#getting-started` works in the URL), but there’s no visible anchor link.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            barCells: [{ k: 'override', v: 'none' }],
            sourceUrl: `${SOURCE_URL}linked-headings/demos/DefaultHeadings.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'RENDERER',
            title: { prefix: 'custom ', accent: 'renderer', end: '.' },
            description:
                'A dedicated `LinkedHeading.svelte` component replaces the default heading renderer via `renderers={{ heading: LinkedHeading }}`. Best when the override has its own state, or you want to reuse it across pages.',
            snippet: rendererSection,
            codeSnippet: rendererCode,
            barCells: [{ k: 'override', v: 'component' }],
            sourceUrl: `${SOURCE_URL}linked-headings/demos/RendererHeadings.svelte`
        },
        {
            figId: 'FIG-003',
            tag: 'SNIPPET',
            title: { prefix: 'snippet ', accent: 'override', end: '.' },
            description:
                'An inline `{#snippet heading()}` block adds a hover-reveal `#` anchor right at the call site. Best for one-off tweaks that don’t earn their own component file.',
            snippet: snippetSection,
            codeSnippet: snippetCode,
            barCells: [{ k: 'override', v: 'inline snippet' }],
            sourceUrl: `${SOURCE_URL}linked-headings/demos/SnippetHeadings.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet defaultSection()}
    <DefaultHeadings />
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'default-headings',
                label: 'DefaultHeadings.svelte',
                ...manifest['linked-headings/demos/DefaultHeadings.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#snippet rendererSection()}
    <RendererHeadings />
{/snippet}
{#snippet rendererCode()}
    <!-- Two-cell grid: the consumer's call site on the left, the heading
         renderer component on the right. Both come from the manifest so
         editing either file updates the displayed code automatically. -->
    <CodeReferenceV2
        samples={[
            {
                id: 'page-usage',
                label: 'RendererHeadings.svelte',
                ...manifest['linked-headings/demos/RendererHeadings.svelte']
            },
            {
                id: 'linked-heading-component',
                label: 'LinkedHeading.svelte',
                ...manifest['linked-headings/demos/LinkedHeading.svelte']
            }
        ]}
        columns={2}
    />
{/snippet}

{#snippet snippetSection()}
    <SnippetHeadings />
{/snippet}
{#snippet snippetCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'snippet-headings',
                label: 'SnippetHeadings.svelte',
                ...manifest['linked-headings/demos/SnippetHeadings.svelte']
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
