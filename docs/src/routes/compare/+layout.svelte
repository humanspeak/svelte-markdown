<script lang="ts">
    import { CompareLayoutV2, enhanceCodeBlocks } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children } = $props()

    const PKG_VERSION = rootPkg.version

    function buildCompareBreadcrumbs(pathname: string) {
        if (pathname === '/compare') return [{ title: 'Compare' }]
        const slug = pathname.replace('/compare/', '')
        const name = slug
            .replace('vs-', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase())
        return [{ title: 'Compare', href: '/compare' }, { title: `vs ${name}` }]
    }
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
    breadcrumbResolver={buildCompareBreadcrumbs}
>
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
    </div>
</CompareLayoutV2>
