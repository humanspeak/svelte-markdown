<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type DemoManifestEntry,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import DefaultRenderers from '$lib/examples/custom-renderers/demos/DefaultRenderers.svelte'
    import FilteredRenderers from '$lib/examples/custom-renderers/demos/FilteredRenderers.svelte'
    import { Filter, Layers, Sparkles, Wrench } from '@lucide/svelte'
    import demoManifest from '$lib/demo-manifest.json'

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

    const manifest = demoManifest as Record<string, DemoManifestEntry>

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'DEFAULT',
            title: { prefix: 'default ', accent: 'renderers', end: '.' },
            description:
                'No renderer override — every built-in lights up. Headings, paragraphs, lists, code blocks, tables, blockquotes, and horizontal rules all render normally.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            notes: defaultNotes,
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
            notes: filteredNotes,
            barCells: [{ k: 'renderers', v: 'allow-list' }],
            sourceUrl: `${SOURCE_URL}custom-renderers/demos/FilteredRenderers.svelte`
        }
    ]
</script>

{#snippet defaultSection()}
    <DefaultRenderers />
{/snippet}
{#snippet defaultNotes()}
    <ul>
        <li>
            <Layers />
            <span>
                Pass nothing for <code>renderers</code> and every built-in lights up — paragraphs, headings,
                lists, code blocks, tables, blockquotes, rules.
            </span>
        </li>
        <li>
            <Sparkles />
            <span>
                The right default for content authoring. You get full markdown fidelity with no
                opt-in needed.
            </span>
        </li>
    </ul>
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
{#snippet filteredNotes()}
    <ul>
        <li>
            <Filter />
            <span>
                <code>allowRenderersOnly([...])</code> turns the renderer map into an allow-list. Anything
                not in the list silently drops out.
            </span>
        </li>
        <li>
            <Wrench />
            <span>
                Use to strip features the source supports but you don't want — e.g. no code blocks
                in chat bubbles, no tables in mobile previews.
            </span>
        </li>
    </ul>
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
