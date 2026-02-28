<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import MarkedExtensions from '$lib/examples/MarkedExtensions.svelte'

    const breadcrumbs = getBreadcrumbContext()
    if (breadcrumbs) {
        breadcrumbs.breadcrumbs = [
            { title: 'Examples', href: '/examples' },
            { title: 'Marked Extensions' }
        ]
    }

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

<Example
    title="Marked Extensions"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/MarkedExtensions.svelte"
>
    <MarkedExtensions />
</Example>
