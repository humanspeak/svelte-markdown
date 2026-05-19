<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import MarkedExtensions from '$lib/examples/MarkedExtensions.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Marked Extensions | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of marked extensions with KaTeX math rendering in @humanspeak/svelte-markdown. See component renderers and snippet overrides side by side.'
        seo.ogTitle = 'Marked Extensions'
        seo.ogTagline = 'KaTeX math rendering demo.'
        seo.ogFeatures = ['KaTeX Math', 'Live Preview', 'Component Mode', 'Snippet Mode']
        seo.ogSlug = 'examples-marked-extensions'
    }
</script>

<ExampleV2
    figId="FIG-001"
    tag="EXTENSIONS"
    title={{ prefix: 'marked ', accent: 'extensions', end: '.' }}
    description="Plug in marked extensions for KaTeX math, GitHub alerts, and more — render via component renderers or inline snippets."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/MarkedExtensions.svelte"
>
    <MarkedExtensions />
</ExampleV2>
