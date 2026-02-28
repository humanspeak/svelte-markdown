<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import Footnotes from '$lib/examples/Footnotes.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Footnotes' }
            ]
        }
    })

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

<Example
    title="Footnotes"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/Footnotes.svelte"
>
    <Footnotes />
</Example>
