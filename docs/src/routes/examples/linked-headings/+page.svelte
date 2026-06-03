<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import DefaultHeadings from '$lib/examples/linked-headings/demos/DefaultHeadings.svelte'
    import RendererHeadings from '$lib/examples/linked-headings/demos/RendererHeadings.svelte'
    import SnippetHeadings from '$lib/examples/linked-headings/demos/SnippetHeadings.svelte'
    import { Anchor, Code, Hash, Link, Sparkles, Wrench } from '@lucide/svelte'

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
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'DEFAULT',
            title: { prefix: 'default ', accent: 'headings', end: '.' },
            description:
                'Stock headings — each gets an `id` derived from its text (so `#getting-started` works in the URL), but there’s no visible anchor link.',
            snippet: defaultSection,
            codeSnippet: defaultCode,
            notes: defaultNotes,
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
            notes: rendererNotes,
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
            notes: snippetNotes,
            barCells: [{ k: 'override', v: 'inline snippet' }],
            sourceUrl: `${SOURCE_URL}linked-headings/demos/SnippetHeadings.svelte`
        }
    ]
</script>

{#snippet defaultSection()}
    <DefaultHeadings />
{/snippet}
{#snippet defaultNotes()}
    <ul>
        <li>
            <Hash />
            <span>
                Every heading already gets an <code>id</code> derived from its text via
                <code>github-slugger</code>. The URL <code>#getting-started</code> jumps to that heading.
            </span>
        </li>
        <li>
            <Anchor />
            <span>
                There's just no visible anchor link — readers can't deep-link by clicking. The next
                two FIGs add that affordance.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet defaultCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'linked-headings/demos/DefaultHeadings.svelte',
                'default-headings',
                'DefaultHeadings.svelte'
            )
        ]}
        columns={1}
    />
{/snippet}

{#snippet rendererSection()}
    <RendererHeadings />
{/snippet}
{#snippet rendererNotes()}
    <ul>
        <li>
            <Code />
            <span>
                Pass <code>{'renderers={{ heading: LinkedHeading }}'}</code> and your component receives
                the heading depth + text + raw HTML.
            </span>
        </li>
        <li>
            <Wrench />
            <span>
                Best when the override has its own state (clipboard copy, scroll-spy) or needs to be
                reused across multiple pages.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet rendererCode()}
    <!-- Two-cell grid: the consumer's call site on the left, the heading
         renderer component on the right. Both code samples lazy-load from
         generated docs-kit demo modules. -->
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'linked-headings/demos/RendererHeadings.svelte',
                'page-usage',
                'RendererHeadings.svelte'
            ),
            demoCodeSample(
                'linked-headings/demos/LinkedHeading.svelte',
                'linked-heading-component',
                'LinkedHeading.svelte'
            )
        ]}
        columns={2}
    />
{/snippet}

{#snippet snippetSection()}
    <SnippetHeadings />
{/snippet}
{#snippet snippetNotes()}
    <ul>
        <li>
            <Link />
            <span>
                <code>{'{#snippet heading({ depth, text })}'}</code> renders right at the call site —
                no separate file or props passing required.
            </span>
        </li>
        <li>
            <Sparkles />
            <span>
                Best for one-off layout tweaks per page. The hover-reveal <code>#</code> anchor here is
                just a few lines of inline template.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet snippetCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'linked-headings/demos/SnippetHeadings.svelte',
                'snippet-headings',
                'SnippetHeadings.svelte'
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
