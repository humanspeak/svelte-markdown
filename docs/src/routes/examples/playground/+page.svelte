<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import MarkdownPlayground from '$lib/examples/MarkdownPlayground.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Live Playground' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Live Playground | Examples | Svelte Markdown'
        seo.description =
            'Interactive markdown playground with live preview. Edit markdown and HTML in real-time, powered by @humanspeak/svelte-markdown.'
    }
</script>

<Example
    title="Live Playground"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/MarkdownPlayground.svelte"
>
    <MarkdownPlayground />
</Example>
