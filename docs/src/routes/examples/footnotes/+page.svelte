<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/footnotes/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/footnotes/demos/SnippetRendered.svelte'
    import { ArrowLeftRight, BookOpen, Code, Paintbrush, Puzzle } from '@lucide/svelte'

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
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'COMPONENT',
            title: { prefix: 'component ', accent: 'renderers', end: '.' },
            description:
                'Pair the built-in `FootnoteRef` + `FootnoteSection` components through the `renderers` prop. Best for long-form / academic writing that needs consistent footnote styling across pages.',
            snippet: componentSection,
            codeSnippet: componentCode,
            notes: componentNotes,
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
            notes: snippetNotes,
            barCells: [{ k: 'override', v: 'inline snippets' }],
            sourceUrl: `${SOURCE_URL}footnotes/demos/SnippetRendered.svelte`
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
                <code>markedFootnote()</code> extension parses <code>[^id]</code> references +
                <code>[^id]: text</code> definitions into linked footnote tokens.
            </span>
        </li>
        <li>
            <ArrowLeftRight />
            <span>
                Built-in <code>FootnoteRef</code> + <code>FootnoteSection</code> give you superscript
                reference numerals and a backlink from the definition list.
            </span>
        </li>
        <li>
            <BookOpen />
            <span>
                Best for long-form / academic writing where footnote styling should stay identical
                across every page.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet componentCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'footnotes/demos/ComponentRendered.svelte',
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
                Inline <code>{'{#snippet footnoteRef}'}</code> +
                <code>{'{#snippet footnoteSection}'}</code> keep the bidirectional links but let one page
                own its markup.
            </span>
        </li>
        <li>
            <Paintbrush />
            <span>
                Demo here swaps superscript for <code>[n]</code> bracketed references and a chip-labelled
                definition list — all per-page, no shared component.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet snippetCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'footnotes/demos/SnippetRendered.svelte',
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
