<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/github-alerts/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/github-alerts/demos/SnippetRendered.svelte'
    import { AlertCircle, Code, Layers, Paintbrush, Puzzle } from '@lucide/svelte'
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
        notes?: Snippet
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
            notes: componentNotes,
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
            notes: snippetNotes,
            barCells: [{ k: 'override', v: 'inline snippet' }],
            sourceUrl: `${SOURCE_URL}github-alerts/demos/SnippetRendered.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet componentSection()}
    <ComponentRendered />
{/snippet}
{#snippet componentNotes()}
    <ul>
        <li>
            <Puzzle />
            <span>
                <code>markedAlert()</code> extension parses <code>&gt; [!NOTE]</code> syntax into
                <code>alert</code> tokens — five severities: NOTE, TIP, IMPORTANT, WARNING, CAUTION.
            </span>
        </li>
        <li>
            <Layers />
            <span>
                Pass the built-in <code>AlertRenderer</code> through <code>renderers</code> and every
                page gets the identical look + icon set.
            </span>
        </li>
        <li>
            <AlertCircle />
            <span>
                Best for docs sites: alert styling lives in one component, easy to dark-mode tune,
                accessible by default.
            </span>
        </li>
    </ul>
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
{#snippet snippetNotes()}
    <ul>
        <li>
            <Code />
            <span>
                <code>{'{#snippet alert({ variant, text })}'}</code> gives this page full control over
                markup — different icons, layout, or even an entirely different design.
            </span>
        </li>
        <li>
            <Paintbrush />
            <span>
                Use when you need page-specific alert styling that shouldn't leak into the site-wide
                component.
            </span>
        </li>
    </ul>
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
        notes={section.notes}
    >
        {@render section.snippet()}
    </ExampleV2>
{/each}
