<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import AllowAllHtml from '$lib/examples/html-filtering/demos/AllowAllHtml.svelte'
    import AllowOnlySafe from '$lib/examples/html-filtering/demos/AllowOnlySafe.svelte'
    import BlockAllHtml from '$lib/examples/html-filtering/demos/BlockAllHtml.svelte'
    // The manifest is generated at build/dev start by `demoManifestPlugin`
    // (registered in vite.config.ts). Each entry's key is the demo file's
    // path relative to `src/lib/examples/`. Editing any demo file
    // regenerates the manifest and Vite reloads the page — the rendered
    // demo and the displayed code stay in lockstep with zero per-page
    // bookkeeping.
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'HTML Filtering | Examples | Svelte Markdown'
        seo.description =
            'Three HTML filtering policies for @humanspeak/svelte-markdown — see the same markdown rendered under unrestricted, safe-only, and blocked policies side-by-side.'
        seo.ogTitle = 'HTML Filtering'
        seo.ogTagline = 'Allow all, allow only safe, block all — three policies, three sheets.'
        seo.ogFeatures = ['Unrestricted', 'Safe Only', 'Blocked']
        seo.ogSlug = 'examples-html-filtering'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'

    // ── Sheet configuration ────────────────────────────────────────────
    // One row per sheet section. Each row carries lede words for the left
    // column and references the demo file in `manifestKey` — the demo
    // component is mounted as the body, and the manifest entry is fed
    // through CodeReferenceV2 as the toggleable code panel. Adding a new
    // policy is one new demo file + one row here.
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
            tag: 'UNRESTRICTED',
            title: { prefix: 'allow ', accent: 'all html', end: '.' },
            description:
                'Every HTML tag survives into the DOM. Iframes load, forms render, styles apply — only safe with content you fully trust.',
            snippet: allowAllSection,
            codeSnippet: allowAllCode,
            barCells: [{ k: 'policy', v: 'allow-all-html' }],
            sourceUrl: `${SOURCE_URL}html-filtering/demos/AllowAllHtml.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'SAFE-ONLY',
            title: { prefix: 'allow only ', accent: 'safe tags', end: '.' },
            description:
                'Allow-list a tight set of formatting tags via allowHtmlOnly. Script, iframe, and anything else dangerous drops silently.',
            snippet: allowSafeSection,
            codeSnippet: allowSafeCode,
            barCells: [{ k: 'policy', v: 'allow-only-safe' }],
            sourceUrl: `${SOURCE_URL}html-filtering/demos/AllowOnlySafe.svelte`
        },
        {
            figId: 'FIG-003',
            tag: 'BLOCKED',
            title: { prefix: 'block ', accent: 'all html', end: '.' },
            description:
                'Strip every HTML tag via buildUnsupportedHTML — markdown formatting only, raw HTML stripped from the output.',
            snippet: blockAllSection,
            codeSnippet: blockAllCode,
            barCells: [{ k: 'policy', v: 'block-all-html' }],
            sourceUrl: `${SOURCE_URL}html-filtering/demos/BlockAllHtml.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet allowAllSection()}
    <AllowAllHtml />
{/snippet}
{#snippet allowAllCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'allow-all-html',
                label: 'AllowAllHtml.svelte',
                ...manifest['html-filtering/demos/AllowAllHtml.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#snippet allowSafeSection()}
    <AllowOnlySafe />
{/snippet}
{#snippet allowSafeCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'allow-only-safe',
                label: 'AllowOnlySafe.svelte',
                ...manifest['html-filtering/demos/AllowOnlySafe.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#snippet blockAllSection()}
    <BlockAllHtml />
{/snippet}
{#snippet blockAllCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'block-all-html',
                label: 'BlockAllHtml.svelte',
                ...manifest['html-filtering/demos/BlockAllHtml.svelte']
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
