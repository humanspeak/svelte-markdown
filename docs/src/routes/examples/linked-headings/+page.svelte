<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import LinkedHeadings from '$lib/examples/LinkedHeadings.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Linked Headings | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of adding clickable anchor links to markdown headings in @humanspeak/svelte-markdown using snippet overrides and custom renderers.'
        seo.ogTitle = 'Linked Headings'
        seo.ogTagline = 'Add clickable anchor links to headings.'
        seo.ogFeatures = ['Snippet Override', 'Custom Renderer', 'Live Demo', 'Permalink']
        seo.ogSlug = 'examples-linked-headings'
    }
</script>

<ExampleV2
    figId="FIG-001"
    tag="SNIPPETS"
    title={{ prefix: 'linked ', accent: 'headings', end: '.' }}
    description="Clickable anchor permalinks on every heading — via a snippet override or a custom renderer component."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/LinkedHeadings.svelte"
>
    <LinkedHeadings />
</ExampleV2>
