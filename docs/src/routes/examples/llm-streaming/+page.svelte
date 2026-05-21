<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type DemoManifestEntry,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import StreamingConsole from '$lib/examples/llm-streaming/demos/StreamingConsole.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import { Activity, DollarSign, Lightbulb, Zap } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'LLM Streaming | Examples | Svelte Markdown'
        seo.description =
            'Simulate real model streaming with @humanspeak/svelte-markdown — out-of-order offset patches, adjustable speed and jitter, live render metrics. See how SvelteMarkdown converges as ChatGPT / Claude / Gemini-style chunks arrive.'
        seo.ogTitle = 'LLM Streaming Demo'
        seo.ogTagline = 'Out-of-order offset patches with live render metrics.'
        seo.ogFeatures = [
            'Out-of-order Patches',
            'Live Metrics',
            'Speed + Jitter',
            'Render Performance'
        ]
        seo.ogSlug = 'examples-llm-streaming'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'

    const manifest = demoManifest as Record<string, DemoManifestEntry>

    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'STREAMING',
            title: { prefix: 'llm ', accent: 'streaming', end: '.' },
            description:
                'Stream markdown the way real models actually deliver it — `{ value, offset }` patches that can arrive out of order. Toggle speed, jitter, and granularity to stress-test ChatGPT / Claude / Gemini delivery patterns.',
            snippet: streamingSection,
            codeSnippet: streamingCode,
            notes: streamingNotes,
            barCells: [{ k: 'mode', v: 'offset · jumbled' }],
            sourceUrl: `${SOURCE_URL}llm-streaming/demos/StreamingConsole.svelte`
        }
    ]
</script>

{#snippet streamingSection()}
    <StreamingConsole />
{/snippet}

{#snippet streamingNotes()}
    <ul>
        <li>
            <Zap />
            <span>
                LLMs stream tokens via SSE. SvelteMarkdown re-parses and re-renders on each update,
                keeping output in sync — even when patches arrive out of order.
            </span>
        </li>
        <li>
            <Activity />
            <span>
                Render times stay under one frame budget (16ms) for typical LLM speeds of 30–80
                tokens/sec.
            </span>
        </li>
        <li>
            <DollarSign />
            <span>
                Track token costs across providers with
                <a href="https://modelpricing.ai" target="_blank" rel="noopener noreferrer">
                    ModelPricing.ai
                </a>.
            </span>
        </li>
        <li>
            <Lightbulb />
            <span>
                Building a chat UI? Pair with
                <a href="https://virtualchat.svelte.page" target="_blank" rel="noopener noreferrer">
                    @humanspeak/svelte-virtual-chat
                </a>
                for a virtualized chat viewport purpose-built for LLM conversations.
            </span>
        </li>
    </ul>
{/snippet}

{#snippet streamingCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'streaming-console',
                label: 'StreamingConsole.svelte',
                ...manifest['llm-streaming/demos/StreamingConsole.svelte']
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
