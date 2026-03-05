<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
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

<Example
    title="Mermaid Diagrams"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/Mermaid.svelte"
>
    <Mermaid />
</Example>
