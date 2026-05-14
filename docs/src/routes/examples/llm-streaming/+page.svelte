<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import LlmStreaming from '$lib/examples/LlmStreaming.svelte'

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
</script>

<Example
    title="LLM Streaming"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/LlmStreaming.svelte"
>
    <LlmStreaming />
</Example>
