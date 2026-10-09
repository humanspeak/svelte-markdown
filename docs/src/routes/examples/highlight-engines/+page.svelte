<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import StreamingSideBySide from '$lib/examples/highlight-engines/demos/StreamingSideBySide.svelte'
    import { Gauge, Highlighter, Package, Palette, Zap } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Highlight Engines: Shiki vs TanStack | Examples | Svelte Markdown'
        seo.h1 = { title: 'Highlight Engines' }
        seo.description =
            'Stream the same AI response through Shiki and TanStack Highlight side by side with one HighlightedCode renderer — live per-engine highlight timings, semantic-class vs inline-color output, and bundle tradeoffs.'
        seo.ogTitle = 'Highlight Engines: Shiki vs TanStack'
        seo.ogTagline = 'One code renderer. Two engines. Streamed side by side.'
        seo.ogFeatures = ['Shiki', 'TanStack Highlight', 'Streaming-safe', 'Live Timings']
        seo.ogSlug = 'examples-highlight-engines'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'STREAMING',
            title: { prefix: 'shiki vs ', accent: 'tanstack', end: '.' },
            description:
                'The same code-heavy response streams into two `SvelteMarkdown` instances. Both use the engine-agnostic `HighlightedCode` renderer; each pane injects a different `CodeHighlighter` via context. Every highlight call is timed so you can see the per-engine cost as fences close.',
            snippet: streamingSection,
            codeSnippet: streamingCode,
            notes: streamingNotes,
            barCells: [{ k: 'renderer', v: 'HighlightedCode' }],
            sourceUrl: `${SOURCE_URL}highlight-engines/demos/StreamingSideBySide.svelte`
        }
    ]
</script>

{#snippet streamingSection()}
    <StreamingSideBySide />
{/snippet}
{#snippet streamingNotes()}
    <ul>
        <li>
            <Highlighter />
            <span>
                One renderer, any engine: <code>HighlightedCode</code> reads a
                <code>CodeHighlighter</code> from a prop, <code>HIGHLIGHT_CONTEXT_KEY</code>, or the
                <code>setCodeHighlighter</code> singleton. Swapping Shiki for TanStack is a one-line factory
                change.
            </span>
        </li>
        <li>
            <Zap />
            <span>
                Both engines are synchronous, so neither trips the async-extension guard and
                <code>streaming</code> stays on. Completed fences are memoized — watch
                <em>calls</em> stop climbing once a block closes and prose keeps streaming.
            </span>
        </li>
        <li>
            <Gauge />
            <span>
                The timings are per-engine wall-clock for every highlight call, captured by wrapping
                the two-method interface. The open fence re-highlights per flush; that is where the
                engines separate.
            </span>
        </li>
        <li>
            <Palette />
            <span>
                Shiki inlines theme colors per token. TanStack emits semantic <code>th-*</code>
                classes; the theme is a stylesheet from <code>createThemeCss</code>, so light/dark
                is a CSS toggle with no re-highlight.
            </span>
        </li>
        <li>
            <Package />
            <span>
                Both engines are opt-in peers. Importing the renderer alone bundles neither; the
                core
                <code>SvelteMarkdown</code> bundle stays engine-free (enforced by the tree-shaking guard).
            </span>
        </li>
    </ul>
{/snippet}
{#snippet streamingCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'highlight-engines/demos/StreamingSideBySide.svelte',
                'streaming-side-by-side',
                'StreamingSideBySide.svelte'
            ),
            demoCodeSample(
                'highlight-engines/demos/EnginePane.svelte',
                'engine-pane',
                'EnginePane.svelte'
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
