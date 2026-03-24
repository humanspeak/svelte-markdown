<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import LlmStreaming from '$lib/examples/LlmStreaming.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'LLM Streaming | Examples | Svelte Markdown'
        seo.description =
            'Simulate real-time LLM token streaming with @humanspeak/svelte-markdown. Measure render performance for ChatGPT-style AI response rendering with adjustable speed and chunking.'
        seo.ogTitle = 'LLM Streaming Demo'
        seo.ogTagline = 'Real-time AI response rendering with live metrics.'
        seo.ogFeatures = ['Token Streaming', 'Live Metrics', 'Custom Markdown', 'Performance']
        seo.ogSlug = 'examples-llm-streaming'
    }
</script>

<Example
    title="LLM Streaming"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/LlmStreaming.svelte"
>
    <LlmStreaming />
</Example>
