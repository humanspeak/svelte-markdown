<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import SnippetOverrides from '$lib/examples/SnippetOverrides.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Snippet Overrides' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Snippet Overrides | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of Svelte 5 snippet overrides in @humanspeak/svelte-markdown. See how to customize rendering inline without separate component files.'
    }
</script>

<Example
    title="Snippet Overrides"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/SnippetOverrides.svelte"
>
    <SnippetOverrides />
</Example>
