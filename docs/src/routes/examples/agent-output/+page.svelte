<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import AgentOutput from '$lib/examples/AgentOutput.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'AI Agent Output | Examples | Svelte Markdown'
        seo.description =
            'Watch @humanspeak/svelte-markdown render streaming HTML from a simulated AI agent — with live sanitization that blocks javascript: URLs and on*= event handlers as they arrive.'
        seo.ogTitle = 'AI Agent Output Demo'
        seo.ogTagline = 'Streaming agent HTML with live XSS sanitization.'
        seo.ogFeatures = [
            'Streaming HTML',
            'Live Sanitization',
            'XSS Protection',
            'Mixed Markdown + HTML'
        ]
        seo.ogSlug = 'examples-agent-output'
    }
</script>

<Example
    title="AI Agent Output"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/AgentOutput.svelte"
>
    <AgentOutput />
</Example>
