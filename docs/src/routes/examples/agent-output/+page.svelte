<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
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

<ExampleV2
    figId="FIG-001"
    tag="STREAMING"
    title={{ prefix: 'agent ', accent: 'output', end: '.' }}
    description="A simulated agent streams mixed markdown and HTML — with a live log of every javascript: URL and on*= handler the sanitizer blocks."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/AgentOutput.svelte"
>
    <AgentOutput />
</ExampleV2>
