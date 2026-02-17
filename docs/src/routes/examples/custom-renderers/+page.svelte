<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import CustomRenderers from '$lib/examples/CustomRenderers.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Custom Renderers' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Custom Renderers | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of custom renderer overrides in @humanspeak/svelte-markdown. See how to control which markdown elements render.'
    }
</script>

<Example
    title="Custom Renderers"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/CustomRenderers.svelte"
>
    <CustomRenderers />
</Example>
