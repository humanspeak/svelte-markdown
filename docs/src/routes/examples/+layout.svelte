<script lang="ts">
    import { page } from '$app/state'
    import { afterNavigate } from '$app/navigation'
    import Header from '$lib/components/general/Header.svelte'
    import Footer from '$lib/components/general/Footer.svelte'
    import { getBreadcrumbContext } from '@humanspeak/docs-kit'
    import { buildBreadcrumbs } from '$lib/docsNav'
    import { enhanceCodeBlocks } from '$lib/actions/enhanceCodeBlocks'

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
    <Header />
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
    </div>
    <Footer />
</div>
