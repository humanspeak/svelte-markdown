<script lang="ts">
    import { ExampleLayoutV2, enhanceCodeBlocks } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import { buildBreadcrumbs, headerNav } from '$lib/docsNav'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children } = $props()
    const PKG_VERSION = rootPkg.version
</script>

<ExampleLayoutV2
    config={docsConfig}
    {favicon}
    version={PKG_VERSION}
    nav={headerNav}
    breadcrumbResolver={buildBreadcrumbs}
>
    <div class="flex flex-1 flex-col" use:enhanceCodeBlocks>
        {@render children?.()}
    </div>
</ExampleLayoutV2>
