<script lang="ts">
    import { page } from '$app/state'
    import { afterNavigate } from '$app/navigation'
    import { Header, Footer, getBreadcrumbContext, enhanceCodeBlocks } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'

    const { children } = $props()

    const breadcrumbContext = getBreadcrumbContext()

    function buildCompareBreadcrumbs(pathname: string) {
        if (pathname === '/compare') return [{ title: 'Compare' }]
        const slug = pathname.replace('/compare/', '')
        const name = slug
            .replace('vs-', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        return [{ title: 'Compare', href: '/compare' }, { title: `vs ${name}` }]
    }

    if (breadcrumbContext) {
        breadcrumbContext.breadcrumbs = buildCompareBreadcrumbs(page.url.pathname)
    }

    afterNavigate(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = buildCompareBreadcrumbs(page.url.pathname)
        }
    })
</script>

<div class="bg-background relative flex min-h-screen flex-col">
    <Header config={docsConfig} {favicon} />
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
    </div>
    <Footer />
</div>
