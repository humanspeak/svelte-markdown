<script lang="ts">
    import favicon from '$lib/assets/logo.svg'
    import { docsConfig } from '$lib/docs-config'
    import { BlogLayout } from '@humanspeak/docs-kit/blog'

    const { children } = $props()
</script>

<BlogLayout config={docsConfig} {favicon}>
    {@render children?.()}
</BlogLayout>
