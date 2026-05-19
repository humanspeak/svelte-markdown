<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import PrettierExtension from '$lib/examples/code-formatting/demos/PrettierExtension.svelte'
    import SnippetRendered from '$lib/examples/code-formatting/demos/SnippetRendered.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Code Formatting | Examples | Svelte Markdown'
        seo.description =
            'Two ways to format code blocks in @humanspeak/svelte-markdown — the async marked-code-format walkTokens extension (Prettier-powered) and an inline {#snippet code} override.'
        seo.ogTitle = 'Code Formatting'
        seo.ogTagline = 'walkTokens extension vs snippet override on code fences.'
        seo.ogFeatures = ['Prettier walkTokens', 'Snippet Override', 'Language Badge', 'Lazy Load']
        seo.ogSlug = 'examples-code-formatting'
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
            tag: 'EXTENSION',
            title: { prefix: 'prettier ', accent: 'walktokens', end: '.' },
            description:
                'Add `prettier` to any code fence and the `marked-code-format` extension auto-formats it through Prettier — async walkTokens callback, no custom renderer needed.',
            snippet: extensionSection,
            codeSnippet: extensionCode,
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
            barCells: [{ k: 'technique', v: 'inline snippet' }],
            sourceUrl: `${SOURCE_URL}code-formatting/demos/SnippetRendered.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet extensionSection()}
    <PrettierExtension />
{/snippet}
{#snippet extensionCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'prettier-extension',
                label: 'PrettierExtension.svelte',
                ...manifest['code-formatting/demos/PrettierExtension.svelte']
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
                ...manifest['code-formatting/demos/SnippetRendered.svelte']
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
