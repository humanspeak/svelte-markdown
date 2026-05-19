<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import SnippetOverrides from '$lib/examples/SnippetOverrides.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Snippet Overrides | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of Svelte 5 snippet overrides in @humanspeak/svelte-markdown. See how to customize rendering inline without separate component files.'
        seo.ogTitle = 'Snippet Overrides'
        seo.ogTagline = 'Customize rendering inline without separate files.'
        seo.ogFeatures = ['Inline Override', 'No Extra Files', 'Live Demo', 'Svelte 5']
        seo.ogSlug = 'examples-snippet-overrides'
    }
</script>

<ExampleV2
    figId="FIG-001"
    tag="SNIPPETS"
    title={{ prefix: 'snippet ', accent: 'overrides', end: '.' }}
    description="Customise rendering inline with Svelte 5 snippets — no separate component files needed, the override travels with the call site."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/SnippetOverrides.svelte"
>
    <SnippetOverrides />
</ExampleV2>
