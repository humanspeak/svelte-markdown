<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import PrettierExtension from '$lib/examples/code-formatting/demos/PrettierExtension.svelte'
    import SnippetRendered from '$lib/examples/code-formatting/demos/SnippetRendered.svelte'
    import { Code, Package, Puzzle, Tag, Wrench } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Code Formatting | Examples | Svelte Markdown'
        seo.h1 = { title: 'Code Formatting' }
        seo.description =
            'Format code blocks in @humanspeak/svelte-markdown with an async marked-code-format walkTokens extension or an inline Svelte 5 code snippet override.'
        seo.ogTitle = 'Code Formatting'
        seo.ogTagline = 'walkTokens extension vs snippet override on code fences.'
        seo.ogFeatures = ['Prettier walkTokens', 'Snippet Override', 'Language Badge', 'Lazy Load']
        seo.ogSlug = 'examples-code-formatting'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'EXTENSION',
            title: { prefix: 'prettier ', accent: 'walktokens', end: '.' },
            description:
                'Add `prettier` to any code fence and the `marked-code-format` extension auto-formats it through Prettier — async walkTokens callback, no custom renderer needed.',
            snippet: extensionSection,
            codeSnippet: extensionCode,
            notes: extensionNotes,
            barCells: [{ k: 'technique', v: 'extension' }],
            sourceUrl: `${SOURCE_URL}code-formatting/demos/PrettierExtension.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'SNIPPET',
            title: { prefix: 'snippet ', accent: 'override', end: '.' },
            description:
                'Use an inline `{#snippet code}` to control the code block markup — language badge in the corner, brut chrome around the body. Receives `{ lang, text }` props.',
            snippet: snippetSectionRender,
            codeSnippet: snippetCode,
            notes: snippetNotes,
            barCells: [{ k: 'technique', v: 'inline snippet' }],
            sourceUrl: `${SOURCE_URL}code-formatting/demos/SnippetRendered.svelte`
        }
    ]
</script>

{#snippet extensionSection()}
    <PrettierExtension />
{/snippet}
{#snippet extensionNotes()}
    <ul>
        <li>
            <Puzzle />
            <span>
                <code>marked-code-format</code> registers an async <code>walkTokens</code>
                callback that runs Prettier on every code fence with the <code>prettier</code>
                info-string marker.
            </span>
        </li>
        <li>
            <Package />
            <span>
                Prettier loads lazily — only when a fence opts in. No bundle cost when you're not
                using it.
            </span>
        </li>
        <li>
            <Wrench />
            <span>
                Best when you ingest raw, unformatted code (e.g. agent output) and want consistent
                code-block presentation.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet extensionCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'code-formatting/demos/PrettierExtension.svelte',
                'prettier-extension',
                'PrettierExtension.svelte'
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
                <code>{'{#snippet code({ lang, text })}'}</code> receives the parsed language + body.
                Wrap it in any chrome you want — language badge, copy button, line numbers.
            </span>
        </li>
        <li>
            <Tag />
            <span>
                Pairs nicely with the extension above: format with
                <code>marked-code-format</code>, then present with the snippet.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet snippetCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'code-formatting/demos/SnippetRendered.svelte',
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
