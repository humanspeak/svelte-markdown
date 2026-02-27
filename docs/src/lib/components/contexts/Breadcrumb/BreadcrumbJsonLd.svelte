<script lang="ts">
    import { page } from '$app/state'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'

    const ctx = getBreadcrumbContext()

    const jsonLd = $derived.by(() => {
        if (!ctx?.breadcrumbs?.length) return ''
        const origin = page.url.origin
        return JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: ctx.breadcrumbs.map((crumb, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: crumb.title,
                ...(crumb.href ? { item: `${origin}${crumb.href}` } : {})
            }))
        })
    })
</script>

<svelte:head>
    {#if jsonLd}
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
        {@html '<script type="application/ld+json">' + jsonLd + '<' + '/script>'}
    {/if}
</svelte:head>
