<script lang="ts">
    import { page } from '$app/state'
    import { afterNavigate } from '$app/navigation'
    import {
        HeaderV2,
        FooterV2,
        getBreadcrumbContext,
        enhanceCodeBlocks
    } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import { buildBreadcrumbs } from '$lib/docsNav'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children } = $props()
    const PKG_VERSION = rootPkg.version

    const breadcrumbContext = getBreadcrumbContext()
    if (breadcrumbContext) {
        breadcrumbContext.breadcrumbs = buildBreadcrumbs(page.url.pathname)
    }
    afterNavigate(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = buildBreadcrumbs(page.url.pathname)
        }
    })
</script>

<div class="bg-background relative flex min-h-screen flex-col">
    <HeaderV2
        config={docsConfig}
        {favicon}
        version={PKG_VERSION}
        nav={[
            { label: 'docs', href: '/docs' },
            { label: 'examples', href: '/examples' },
            { label: 'compare', href: '/compare' }
        ]}
    />
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
    </div>
    <FooterV2 version={PKG_VERSION} />
</div>
