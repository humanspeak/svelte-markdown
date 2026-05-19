<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/github-alerts/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/github-alerts/demos/SnippetRendered.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'GitHub Alerts | Examples | Svelte Markdown'
        seo.description =
            'GitHub-style alert admonitions in @humanspeak/svelte-markdown — five severity levels (NOTE / TIP / IMPORTANT / WARNING / CAUTION) via the markedAlert extension, rendered two ways: built-in AlertRenderer component vs inline Svelte 5 snippet.'
        seo.ogTitle = 'GitHub Alerts'
        seo.ogTagline = 'Component renderer vs snippet override on the markedAlert extension.'
        seo.ogFeatures = [
            '5 Alert Types',
            'markedAlert Extension',
            'Component Renderer',
            'Snippet Override'
        ]
        seo.ogSlug = 'examples-github-alerts'
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
                'Pass the built-in `AlertRenderer` through the `renderers` prop. Best when alerts need to look identical across pages and the styling lives in one place.',
            snippet: componentSection,
            codeSnippet: componentCode,
            barCells: [{ k: 'override', v: 'component' }],
            sourceUrl: `${SOURCE_URL}github-alerts/demos/ComponentRendered.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'SNIPPET',
            title: { prefix: 'snippet ', accent: 'override', end: '.' },
            description:
                'An inline `{#snippet alert(props)}` block lets each page render alerts however it wants — different icon set, different layout, full markup control.',
            snippet: snippetSectionRender,
            codeSnippet: snippetCode,
            barCells: [{ k: 'override', v: 'inline snippet' }],
            sourceUrl: `${SOURCE_URL}github-alerts/demos/SnippetRendered.svelte`
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
                ...manifest['github-alerts/demos/ComponentRendered.svelte']
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
                ...manifest['github-alerts/demos/SnippetRendered.svelte']
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
