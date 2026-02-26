<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import CodeFormatting from '$lib/examples/CodeFormatting.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'Code Formatting' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Code Formatting | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of marked extensions for code block formatting in @humanspeak/svelte-markdown. See walkTokens extensions and snippet overrides for enhanced code display.'
    }
</script>

<Example
    title="Code Formatting"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/CodeFormatting.svelte"
>
    <CodeFormatting />
</Example>
