<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ReactiveExtensionConsole from '$lib/examples/reactive-extensions/demos/ReactiveExtensionConsole.svelte'
    import { Layers, ListRestart, MousePointerClick, Radar } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Reactive Extensions | Examples | Svelte Markdown'
        seo.description =
            'A live Svelte 5 example showing how to dynamically rebuild marked extensions for @humanspeak/svelte-markdown when extension state changes.'
        seo.ogTitle = 'Reactive Extensions'
        seo.ogTagline = 'Dynamic marked extension state without pushing duplicate extensions.'
        seo.ogFeatures = ['Svelte 5 Runes', 'Marked Extensions', 'Custom Tokens', 'Live Preview']
        seo.ogSlug = 'examples-reactive-extensions'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'REACTIVE',
            title: { prefix: 'dynamic ', accent: 'extension state', end: '.' },
            description:
                'Rebuild a fresh `extensions` array from Svelte state whenever display format changes. The custom tokenizer captures the current format and the parser cache sees a new extension identity.',
            snippet: reactiveSection,
            codeSnippet: reactiveCode,
            notes: reactiveNotes,
            barCells: [
                { k: 'pattern', v: '$derived array' },
                { k: 'issue', v: '#309' }
            ],
            sourceUrl: `${SOURCE_URL}reactive-extensions/demos/ReactiveExtensionConsole.svelte`
        }
    ]
</script>

{#snippet reactiveSection()}
    <ReactiveExtensionConsole />
{/snippet}
{#snippet reactiveNotes()}
    <ul>
        <li>
            <ListRestart />
            <span>
                Treat <code>extensions</code> as immutable: assign a new array when reactive inputs
                change instead of mutating with <code>push</code>, <code>splice</code>, or
                <code>length = 0</code>.
            </span>
        </li>
        <li>
            <Radar />
            <span>
                The tokenizer closure captures the selected display format, then stores it on the
                custom <code>displayButton</code> token.
            </span>
        </li>
        <li>
            <Layers />
            <span>
                Static extensions can live in the same returned array:
                <code>$derived([makeCustom(displayFormat), markedKatex(), markedFootnote()])</code>.
            </span>
        </li>
        <li>
            <MousePointerClick />
            <span>
                Click the format buttons and watch both the rendered chips and tokenizer telemetry
                update from the same markdown source.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet reactiveCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'reactive-extensions/demos/ReactiveExtensionConsole.svelte',
                'reactive-extension-console',
                'ReactiveExtensionConsole.svelte'
            ),
            demoCodeSample(
                'reactive-extensions/demos/DisplayButtonRenderer.svelte',
                'display-button-renderer',
                'DisplayButtonRenderer.svelte'
            )
        ]}
        columns={2}
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
