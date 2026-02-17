<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import HtmlFiltering from '$lib/examples/HtmlFiltering.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'HTML Filtering' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'HTML Filtering | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of HTML allow/deny filtering in @humanspeak/svelte-markdown. Control which HTML tags are rendered from markdown content.'
    }
</script>

<Example
    title="HTML Filtering"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/HtmlFiltering.svelte"
>
    <HtmlFiltering />
</Example>
