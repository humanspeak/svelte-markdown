<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import DefaultRendering from '$lib/examples/snippet-overrides/demos/DefaultRendering.svelte'
    import WithSnippets from '$lib/examples/snippet-overrides/demos/WithSnippets.svelte'
    import { Code, Layers, Paintbrush, Sparkles } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Snippet Overrides | Examples | Svelte Markdown'
        seo.h1 = { title: 'Snippet Overrides' }
        seo.description =
            'Customize @humanspeak/svelte-markdown output with inline Svelte 5 snippet overrides for paragraphs, headings, links, blockquotes, lists, code, and tables.'
        seo.ogTitle = 'Snippet Overrides'
        seo.ogTagline = 'Default vs snippet-customized rendering — same source, two looks.'
        seo.ogFeatures = ['Default Rendering', 'Snippet Overrides', 'Svelte 5 Snippets']
        seo.ogSlug = 'examples-snippet-overrides'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'DEFAULT',
            title: { prefix: 'default ', accent: 'rendering', end: '.' },
            description:
                'No overrides. Every markdown element falls through to its built-in renderer — clean baseline for comparison.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            notes: defaultNotes,
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
            notes: snippetsNotes,
            barCells: [{ k: 'overrides', v: 'inline snippets' }],
            sourceUrl: `${SOURCE_URL}snippet-overrides/demos/WithSnippets.svelte`
        }
    ]
</script>

{#snippet defaultSection()}
    <DefaultRendering />
{/snippet}
{#snippet defaultNotes()}
    <ul>
        <li>
            <Layers />
            <span>
                Same markdown source as the snippet variant — rendered with zero overrides for clean
                baseline comparison.
            </span>
        </li>
        <li>
            <Sparkles />
            <span>
                Headings, paragraphs, lists, code, tables, blockquotes — all fall through to the
                built-in renderers.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'snippet-overrides/demos/DefaultRendering.svelte',
                'default-rendering',
                'DefaultRendering.svelte'
            )
        ]}
        columns={1}
    />
{/snippet}

{#snippet snippetsSection()}
    <WithSnippets />
{/snippet}
{#snippet snippetsNotes()}
    <ul>
        <li>
            <Code />
            <span>
                <code>{'{#snippet paragraph}'}…{'{/snippet}'}</code> overrides happen inline inside
                <code>&lt;SvelteMarkdown&gt;</code> — no separate component files.
            </span>
        </li>
        <li>
            <Paintbrush />
            <span>
                Mix-and-match: override just the elements you care about (heading + blockquote
                here), let the rest fall through.
            </span>
        </li>
        <li>
            <Sparkles />
            <span>
                Snippets are fully typed and take precedence over component renderers — perfect for
                one-off layout tweaks per page.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet snippetsCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'snippet-overrides/demos/WithSnippets.svelte',
                'with-snippets',
                'WithSnippets.svelte'
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
