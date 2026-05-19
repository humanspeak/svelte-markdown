<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Footnotes from '$lib/examples/Footnotes.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Footnotes | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of footnote references and definitions in @humanspeak/svelte-markdown using the built-in markedFootnote extension.'
        seo.ogTitle = 'Footnotes'
        seo.ogTagline = 'Academic-style footnotes in markdown.'
        seo.ogFeatures = [
            'Inline References',
            'Bidirectional Links',
            'Built-in Extension',
            'Named Footnotes'
        ]
        seo.ogSlug = 'examples-footnotes'
    }
</script>

<ExampleV2
    figId="FIG-001"
    tag="EXTENSIONS"
    title={{ prefix: 'academic ', accent: 'footnotes', end: '.' }}
    description="Numbered and named footnote references with bidirectional links — via the built-in markedFootnote extension."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/Footnotes.svelte"
>
    <Footnotes />
</ExampleV2>
