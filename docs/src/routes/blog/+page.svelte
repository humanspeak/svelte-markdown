<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { BlogIndexV2, loadBlogPostsMdsvex } from '@humanspeak/docs-kit/blog'

    const modules = import.meta.glob('/src/routes/blog/*/+page.svx', { eager: true })
    const posts = loadBlogPostsMdsvex(modules)

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Blog | Svelte Markdown'
        seo.description =
            'Notes from the @humanspeak/svelte-markdown team on rendering streaming AI agent output safely in Svelte 5 — security, sanitization, performance, and the patterns that hold up in production.'
        seo.ogTitle = 'Svelte Markdown Blog'
        seo.ogTagline = 'Rendering agent output safely in Svelte 5.'
        seo.ogFeatures = ['Agent Output', 'XSS-Safe', 'Streaming', 'Svelte 5']
        seo.ogSlug = 'blog'
    }
</script>

<BlogIndexV2 {posts} />
