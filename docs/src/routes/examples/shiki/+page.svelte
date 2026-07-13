<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/shiki/demos/ComponentRendered.svelte'
    import FallbackRendered from '$lib/examples/shiki/demos/FallbackRendered.svelte'
    import { Highlighter, Package, Shield, Terminal, Zap } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Syntax Highlighting (Shiki) | Examples | Svelte Markdown'
        seo.h1 = { title: 'Syntax Highlighting (Shiki)' }
        seo.description =
            'Highlight code blocks in @humanspeak/svelte-markdown with the opt-in Shiki extension — a synchronous, streaming-compatible ShikiCode renderer with a safe escaped fallback.'
        seo.ogTitle = 'Syntax Highlighting (Shiki)'
        seo.ogTagline = 'Streaming-safe code highlighting with a safe escaped fallback.'
        seo.ogFeatures = ['Shiki', 'Streaming-safe', 'Escaped Fallback', 'Tree-shaken']
        seo.ogSlug = 'examples-shiki'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'COMPONENT',
            title: { prefix: 'shiki ', accent: 'renderer', end: '.' },
            description:
                'Map `ShikiCode` to the `code` renderer and inject a highlighter via Svelte context. Highlighting runs synchronously, so streaming stays enabled — edit the markdown live.',
            snippet: componentSection,
            codeSnippet: componentCode,
            notes: componentNotes,
            barCells: [{ k: 'override', v: 'component' }],
            sourceUrl: `${SOURCE_URL}shiki/demos/ComponentRendered.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'FALLBACK',
            title: { prefix: 'safe ', accent: 'fallback', end: '.' },
            description:
                'Unregistered languages (and any per-block failure) degrade to an escaped `<pre class="shiki-fallback">` instead of throwing mid-stream — the untrusted lang is only ever an escaped `data-lang`.',
            snippet: fallbackSection,
            codeSnippet: fallbackCode,
            notes: fallbackNotes,
            barCells: [{ k: 'lang', v: 'unregistered' }],
            sourceUrl: `${SOURCE_URL}shiki/demos/FallbackRendered.svelte`
        }
    ]
</script>

{#snippet componentSection()}
    <ComponentRendered />
{/snippet}
{#snippet componentNotes()}
    <ul>
        <li>
            <Highlighter />
            <span>
                <code>ShikiCode</code> is a drop-in for the built-in <code>code</code> renderer
                (same <code>lang</code> / <code>text</code> props) — only fenced blocks change.
            </span>
        </li>
        <li>
            <Zap />
            <span>
                Shiki's <code>createHighlighterCoreSync</code> + the JS regex engine highlight
                synchronously, so the async-extension guard never trips and <code>streaming</code> stays
                on.
            </span>
        </li>
        <li>
            <Package />
            <span>
                Import only the <code>shiki/langs/*</code> and <code>shiki/themes/*</code> you need —
                everything else is tree-shaken out, and the core bundle stays shiki-free.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet componentCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'shiki/demos/ComponentRendered.svelte',
                'component-rendered',
                'ComponentRendered.svelte'
            )
        ]}
        columns={1}
    />
{/snippet}

{#snippet fallbackSection()}
    <FallbackRendered />
{/snippet}
{#snippet fallbackNotes()}
    <ul>
        <li>
            <Shield />
            <span>
                The fenced <code>lang</code> is untrusted (agent/LLM input) — the fallback
                <strong>escapes, never interpolates</strong> it, emitting it only as an escaped
                <code>data-lang</code>.
            </span>
        </li>
        <li>
            <Terminal />
            <span>
                Shiki escapes the code it emits and the fallback escapes too, so the
                <code>{'{@html}'}</code> sink only ever receives library-generated or escaped markup.
            </span>
        </li>
        <li>
            <Highlighter />
            <span>
                Style <code>.shiki-fallback</code> to match your registered blocks — the content is
                a plain escaped <code>&lt;pre&gt;&lt;code&gt;</code>.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet fallbackCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'shiki/demos/FallbackRendered.svelte',
                'fallback-rendered',
                'FallbackRendered.svelte'
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
