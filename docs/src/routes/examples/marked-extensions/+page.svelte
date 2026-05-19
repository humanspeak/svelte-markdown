<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/marked-extensions/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/marked-extensions/demos/SnippetRendered.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Marked Extensions | Examples | Svelte Markdown'
        seo.description =
            'Live KaTeX math rendering with @humanspeak/svelte-markdown via the markedKatex extension. Two takes: built-in KatexRenderer component vs an inline Svelte 5 snippet that calls katex.renderToString directly.'
        seo.ogTitle = 'Marked Extensions'
        seo.ogTagline = 'KaTeX math via the extensions prop — component vs snippet.'
        seo.ogFeatures = ['KaTeX Math', 'Live Preview', 'Component Renderer', 'Snippet Override']
        seo.ogSlug = 'examples-marked-extensions'
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
            title: { prefix: 'component ', accent: 'renderer', end: '.' },
            description:
                'Hand the built-in `KatexRenderer` through the `renderers` prop for both `inlineKatex` and `blockKatex`. Reusable, testable, dark-mode aware.',
            snippet: componentSection,
            codeSnippet: componentCode,
            barCells: [{ k: 'override', v: 'component' }],
            sourceUrl: `${SOURCE_URL}marked-extensions/demos/ComponentRendered.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'SNIPPET',
            title: { prefix: 'snippet ', accent: 'overrides', end: '.' },
            description:
                'Inline `{#snippet inlineKatex}` + `{#snippet blockKatex}` blocks call `katex.renderToString` directly. Best for one-off layouts or wrapping the math output in custom chrome per page.',
            snippet: snippetSectionRender,
            codeSnippet: snippetCode,
            barCells: [{ k: 'override', v: 'inline snippets' }],
            sourceUrl: `${SOURCE_URL}marked-extensions/demos/SnippetRendered.svelte`
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
                ...manifest['marked-extensions/demos/ComponentRendered.svelte']
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
                ...manifest['marked-extensions/demos/SnippetRendered.svelte']
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
