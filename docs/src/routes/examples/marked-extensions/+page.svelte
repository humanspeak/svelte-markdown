<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/marked-extensions/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/marked-extensions/demos/SnippetRendered.svelte'
    import { Code, Layers, Paintbrush, Puzzle, Sigma } from '@lucide/svelte'

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
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'COMPONENT',
            title: { prefix: 'component ', accent: 'renderer', end: '.' },
            description:
                'Hand the built-in `KatexRenderer` through the `renderers` prop for both `inlineKatex` and `blockKatex`. Reusable, testable, dark-mode aware.',
            snippet: componentSection,
            codeSnippet: componentCode,
            notes: componentNotes,
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
            notes: snippetNotes,
            barCells: [{ k: 'override', v: 'inline snippets' }],
            sourceUrl: `${SOURCE_URL}marked-extensions/demos/SnippetRendered.svelte`
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
                <code>markedKatex()</code> extension turns <code>\(…\)</code> and
                <code>\[…\]</code> syntax into <code>inlineKatex</code> /
                <code>blockKatex</code> tokens.
            </span>
        </li>
        <li>
            <Sigma />
            <span>
                Built-in <code>KatexRenderer</code> handles both modes, AMS environments, and dark-mode
                stylesheet variants out of the box.
            </span>
        </li>
        <li>
            <Layers />
            <span>
                Best when math rendering should be consistent across the whole site — one renderer,
                no per-page chrome.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet componentCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'marked-extensions/demos/ComponentRendered.svelte',
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
                <code>{'{#snippet inlineKatex({ text })}'}</code> +
                <code>{'{#snippet blockKatex({ text })}'}</code> call
                <code>katex.renderToString</code> directly inside one component.
            </span>
        </li>
        <li>
            <Paintbrush />
            <span>
                Best for pages that need wrapper chrome (figure + caption, custom container) or
                site-specific math styling.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet snippetCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'marked-extensions/demos/SnippetRendered.svelte',
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
