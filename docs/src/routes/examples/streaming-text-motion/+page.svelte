<script lang="ts">
    import {
        CodeReferenceV2,
        ExampleV2,
        formatSheetLabel,
        type ExampleSection
    } from '@humanspeak/docs-kit'
    import { demoCodeSample } from '$lib/demo-loaders'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import StreamingMotionDemo from '$lib/examples/streaming-text-motion/demos/StreamingMotionDemo.svelte'
    import { Accessibility, Feather, Puzzle, Sparkles } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Streaming Text Motion | Examples | Svelte Markdown'
        seo.h1 = { title: 'Streaming Text Motion' }
        seo.description =
            'Animate streamed markdown as it arrives with @humanspeak/svelte-markdown: FadeWords, RiseWords and FadeCharacters presets, an ink wipe, or a fully custom headless snippet.'
        seo.ogTitle = 'Streaming Text Motion Demo'
        seo.ogTagline = 'Words that arrive gently, with motion you control.'
        seo.ogFeatures = ['Motion Presets', 'Ink Wipe', 'Headless Snippets', 'Reduced Motion']
        seo.ogSlug = 'examples-streaming-text-motion'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'
    const sections: ExampleSection[] = [
        {
            figId: 'FIG-001',
            tag: 'OPTIONAL MOTION',
            title: { prefix: 'streaming ', accent: 'text motion', end: '.' },
            description:
                'Choose an explicitly imported preset or control every segment with a headless snippet. Only arriving text animates; existing content stays visible.',
            snippet: motionSection,
            codeSnippet: motionCode,
            notes: motionNotes,
            barCells: [
                { k: 'presets', v: 'fade · rise · characters' },
                { k: 'motion', v: '@humanspeak/svelte-motion' }
            ],
            sourceUrl: `${SOURCE_URL}streaming-text-motion/demos/StreamingMotionDemo.svelte`
        }
    ]
</script>

{#snippet motionSection()}
    <StreamingMotionDemo />
{/snippet}

{#snippet motionNotes()}
    <ul>
        <li>
            <Sparkles />
            <span>
                Import <code>FadeWords</code>, <code>RiseWords</code> or <code>FadeCharacters</code>
                from <code>@humanspeak/svelte-markdown/streaming/motion</code> and register it as
                the
                <code>rawtext</code> renderer. Nothing animates unless you opt in.
            </span>
        </li>
        <li>
            <Feather />
            <span>
                FadeWords and RiseWords reveal each word with a soft left-to-right ink wipe. Pass
                <code>ink={'{false}'}</code> to turn it off or <code>ink={'{{ duration }}'}</code> to
                retime it.
            </span>
        </li>
        <li>
            <Puzzle />
            <span>
                Override <code>initial</code>, <code>animate</code> and <code>transition</code>, or
                replace the markup entirely with a <code>segment</code> snippet built on the
                headless
                <code>StreamingText</code>.
            </span>
        </li>
        <li>
            <Accessibility />
            <span>
                You decide when motion runs through <code>enabled</code> — wire it to
                <code>prefers-reduced-motion</code>, as this demo does. See the
                <a href="/docs/advanced/llm-streaming#optional-text-arrival-effects"
                    >streaming text API guide</a
                >.
            </span>
        </li>
    </ul>
{/snippet}

{#snippet motionCode()}
    <CodeReferenceV2
        samples={[
            demoCodeSample(
                'streaming-text-motion/demos/StreamingMotionDemo.svelte',
                'streaming-motion-demo',
                'StreamingMotionDemo.svelte'
            ),
            demoCodeSample(
                'streaming-text-motion/demos/MotionStreamingText.svelte',
                'motion-streaming-text',
                'MotionStreamingText.svelte'
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
