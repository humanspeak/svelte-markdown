<script lang="ts">
    import { DocsLayout } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import { buildBreadcrumbs, docsSections } from '$lib/docsNav'
    import favicon from '$lib/assets/logo.svg'

    const { children, data } = $props()
</script>

<DocsLayout
    config={docsConfig}
    sections={docsSections}
    otherProjects={data.otherProjects}
    {favicon}
    breadcrumbResolver={buildBreadcrumbs}
>
    {@render children()}
</DocsLayout>
