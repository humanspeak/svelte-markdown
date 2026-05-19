<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Mermaid from '$lib/examples/Mermaid.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Mermaid Diagrams | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of Mermaid diagram rendering with a custom marked extension in @humanspeak/svelte-markdown. See async component renderers for flowcharts, sequence diagrams, and more.'
        seo.ogTitle = 'Mermaid Diagrams'
        seo.ogTagline = 'Flowcharts and sequence diagrams in markdown.'
        seo.ogFeatures = ['Flowcharts', 'Sequence Diagrams', 'Custom Extension', 'Async Render']
        seo.ogSlug = 'examples-mermaid'
    }
</script>

<ExampleV2
    figId="FIG-001"
    tag="EXTENSIONS"
    title={{ prefix: 'mermaid ', accent: 'diagrams', end: '.' }}
    description="Async Mermaid rendering via a custom marked extension. Flowcharts, sequence diagrams, gantt charts — straight from markdown."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/Mermaid.svelte"
>
    <Mermaid />
</ExampleV2>
