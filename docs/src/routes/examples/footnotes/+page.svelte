<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/footnotes/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/footnotes/demos/SnippetRendered.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Footnotes | Examples | Svelte Markdown'
        seo.description =
            'Academic-style footnotes in @humanspeak/svelte-markdown via the markedFootnote extension, rendered two ways: built-in FootnoteRef + FootnoteSection components vs inline Svelte 5 snippet overrides.'
        seo.ogTitle = 'Footnotes'
        seo.ogTagline = 'Component renderers vs snippet overrides on the markedFootnote extension.'
        seo.ogFeatures = [
            'Inline References',
            'Bidirectional Links',
            'Component Renderer',
            'Snippet Override'
        ]
        seo.ogSlug = 'examples-footnotes'
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
            tag: 'COMPONENT',
            title: { prefix: 'component ', accent: 'renderers', end: '.' },
            description:
                'Pair the built-in `FootnoteRef` + `FootnoteSection` components through the `renderers` prop. Best for long-form / academic writing that needs consistent footnote styling across pages.',
            snippet: componentSection,
            codeSnippet: componentCode,
            barCells: [{ k: 'override', v: 'component' }],
            sourceUrl: `${SOURCE_URL}footnotes/demos/ComponentRendered.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'SNIPPET',
            title: { prefix: 'snippet ', accent: 'overrides', end: '.' },
            description:
                'Inline `{#snippet footnoteRef}` + `{#snippet footnoteSection}` blocks let one page own its footnote markup — bracketed reference style and a chip-labelled definition list, all in one file.',
            snippet: snippetSectionRender,
            codeSnippet: snippetCode,
            barCells: [{ k: 'override', v: 'inline snippets' }],
            sourceUrl: `${SOURCE_URL}footnotes/demos/SnippetRendered.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet componentSection()}
    <ComponentRendered />
{/snippet}
{#snippet componentCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'component-rendered',
                label: 'ComponentRendered.svelte',
                ...manifest['footnotes/demos/ComponentRendered.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#snippet snippetSectionRender()}
    <SnippetRendered />
{/snippet}
{#snippet snippetCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'snippet-rendered',
                label: 'SnippetRendered.svelte',
                ...manifest['footnotes/demos/SnippetRendered.svelte']
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
