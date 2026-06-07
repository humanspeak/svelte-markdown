<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import MarkdownPlayground from '$lib/examples/playground/demos/MarkdownPlayground.svelte'
    import { Edit3, Eye, Zap } from '@lucide/svelte'
    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Live Playground | Examples | Svelte Markdown'
        seo.h1 = { title: 'Live Playground' }
        seo.description =
            'Try an interactive @humanspeak/svelte-markdown playground with live preview, editable markdown and HTML, renderer behavior, and Svelte 5 output.'
        seo.ogTitle = 'Live Playground'
        seo.ogTagline = 'Edit markdown and HTML with real-time preview.'
        seo.ogFeatures = ['Edit & Preview', 'Real-Time', 'Markdown + HTML', 'Full Editor']
        seo.ogSlug = 'examples-playground'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'DEMO',
            title: { prefix: 'live ', accent: 'playground', end: '.' },
            description:
                'Edit markdown on the left, see it rendered on the right. Mix markdown with HTML — both render in real time with a 500ms debounce.',
            snippet: playgroundSection,
            codeSnippet: playgroundCode,
            notes: playgroundNotes,
            barCells: [{ k: 'demo', v: 'markdown + preview' }],
            sourceUrl: `${SOURCE_URL}playground/demos/MarkdownPlayground.svelte`
        }
    ]
</script>

{#snippet playgroundSection()}
    <MarkdownPlayground />
{/snippet}
{#snippet playgroundNotes()}
    <ul>
        <li>
            <Edit3 />
            <span>
                Type or paste markdown on the left. Inline HTML — <code>&lt;em&gt;</code>,
                <code>&lt;span style&gt;</code>, <code>&lt;a&gt;</code> — renders right alongside.
            </span>
        </li>
        <li>
            <Eye />
            <span>
                The preview updates 500ms after the last keystroke, so large pastes don't thrash the
                renderer.
            </span>
        </li>
        <li>
            <Zap />
            <span>
                Powered by the same <code>SvelteMarkdown</code> you'd drop into your own app — no special
                playground harness.
            </span>
        </li>
    </ul>
{/snippet}

{#snippet playgroundCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'playground/demos/MarkdownPlayground.svelte',
                'markdown-playground',
                'MarkdownPlayground.svelte'
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
