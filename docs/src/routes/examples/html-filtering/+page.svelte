<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type DemoManifestEntry,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import AllowAllHtml from '$lib/examples/html-filtering/demos/AllowAllHtml.svelte'
    import AllowOnlySafe from '$lib/examples/html-filtering/demos/AllowOnlySafe.svelte'
    import BlockAllHtml from '$lib/examples/html-filtering/demos/BlockAllHtml.svelte'
    import { AlertTriangle, ShieldCheck, ShieldOff, Sparkles, Filter, Ban } from '@lucide/svelte'
    // The manifest is generated at build/dev start by `demoManifestPlugin`
    // (registered in vite.config.ts). Each entry's key is the demo file's
    // path relative to `src/lib/examples/`. Editing any demo file
    // regenerates the manifest and Vite reloads the page — the rendered
    // demo and the displayed code stay in lockstep with zero per-page
    // bookkeeping.
    import demoManifest from '$lib/demo-manifest.json'

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

    const manifest = demoManifest as Record<string, DemoManifestEntry>

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'UNRESTRICTED',
            title: { prefix: 'allow ', accent: 'all html', end: '.' },
            description:
                'Every HTML tag survives into the DOM. Iframes load, forms render, styles apply — only safe with content you fully trust.',
            snippet: allowAllSection,
            codeSnippet: allowAllCode,
            notes: allowAllNotes,
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
            notes: allowSafeNotes,
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
            notes: blockAllNotes,
            barCells: [{ k: 'policy', v: 'block-all-html' }],
            sourceUrl: `${SOURCE_URL}html-filtering/demos/BlockAllHtml.svelte`
        }
    ]
</script>

{#snippet allowAllSection()}
    <AllowAllHtml />
{/snippet}
{#snippet allowAllNotes()}
    <ul>
        <li>
            <Sparkles />
            <span>
                Default behaviour — every HTML tag is rendered through its built-in renderer
                including <code>iframe</code>, <code>form</code>, and <code>style</code>.
            </span>
        </li>
        <li>
            <AlertTriangle />
            <span>
                Only safe for content you fully trust. Untrusted markdown can inject phishing forms,
                redirect users, or load tracking pixels.
            </span>
        </li>
    </ul>
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
{#snippet allowSafeNotes()}
    <ul>
        <li>
            <Filter />
            <span>
                Pass a tag allow-list to <code>allowHtmlOnly</code> — only those tags render, everything
                else drops out silently.
            </span>
        </li>
        <li>
            <ShieldCheck />
            <span>
                The right default for user-generated content. Keeps formatting like
                <code>&lt;strong&gt;</code>, <code>&lt;em&gt;</code>, and <code>&lt;a&gt;</code>
                while killing script + iframe vectors.
            </span>
        </li>
    </ul>
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
{#snippet blockAllNotes()}
    <ul>
        <li>
            <Ban />
            <span>
                <code>buildUnsupportedHTML()</code> returns a renderer map that drops every HTML tag —
                only markdown formatting survives.
            </span>
        </li>
        <li>
            <ShieldOff />
            <span>
                Best when the source is a markdown editor with no need for raw HTML. Smallest attack
                surface, predictable output.
            </span>
        </li>
    </ul>
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
