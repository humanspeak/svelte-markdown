<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import Mermaid from '$lib/examples/Mermaid.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Mermaid Diagrams' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Mermaid Diagrams | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of Mermaid diagram rendering with a custom marked extension in @humanspeak/svelte-markdown. See async component renderers for flowcharts, sequence diagrams, and more.'
    }
</script>

<Example
    title="Mermaid Diagrams"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/Mermaid.svelte"
>
    <Mermaid />
</Example>
