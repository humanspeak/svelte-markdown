<script lang="ts">
    import {
        CompareLayoutV2,
        buildCompareBreadcrumbs,
        enhanceCodeBlocks
    } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import { getCompetitor } from '$lib/compare-data'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children } = $props()

    const PKG_VERSION = rootPkg.version

    const breadcrumbResolver = (pathname: string) =>
        buildCompareBreadcrumbs(pathname, { getCompetitor })
</script>

<CompareLayoutV2
    config={docsConfig}
    {favicon}
    version={PKG_VERSION}
    nav={[
        { label: 'docs', href: '/docs' },
        { label: 'examples', href: '/examples' },
        { label: 'compare', href: '/compare' }
    ]}
    {breadcrumbResolver}
>
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
    </div>
</CompareLayoutV2>
