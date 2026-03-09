<script lang="ts">
    import { page } from '$app/state'
    import { afterNavigate } from '$app/navigation'
    import { Header, Footer, getBreadcrumbContext, enhanceCodeBlocks } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import { buildBreadcrumbs } from '$lib/docsNav'

    const { children } = $props()

    const breadcrumbContext = getBreadcrumbContext()
    if (breadcrumbContext) {
        // Synchronous for SSR (bots see breadcrumbs on first render)
        breadcrumbContext.breadcrumbs = buildBreadcrumbs(page.url.pathname)
    }

    afterNavigate(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = buildBreadcrumbs(page.url.pathname)
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
