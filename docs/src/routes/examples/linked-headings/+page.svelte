<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import LinkedHeadings from '$lib/examples/LinkedHeadings.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Linked Headings' }
            ]
        }
    })

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

<Example
    title="Linked Headings"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/LinkedHeadings.svelte"
>
    <LinkedHeadings />
</Example>
