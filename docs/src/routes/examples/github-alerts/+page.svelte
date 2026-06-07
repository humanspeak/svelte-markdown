<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/github-alerts/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/github-alerts/demos/SnippetRendered.svelte'
    import { AlertCircle, Code, Layers, Paintbrush, Puzzle } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'GitHub Alerts | Examples | Svelte Markdown'
        seo.h1 = { title: 'GitHub Alerts' }
        seo.description =
            'Render GitHub-style alert admonitions in @humanspeak/svelte-markdown with markedAlert, using AlertRenderer components or inline Svelte 5 snippets.'
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
    const sections: ExampleSection[] = [
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
            demoCodeSample(
                'github-alerts/demos/ComponentRendered.svelte',
                'component-rendered',
                'ComponentRendered.svelte'
            )
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
            demoCodeSample(
                'github-alerts/demos/SnippetRendered.svelte',
                'snippet-rendered',
                'SnippetRendered.svelte'
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
