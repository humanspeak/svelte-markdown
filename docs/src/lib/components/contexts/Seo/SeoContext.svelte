<script lang="ts">
    import { type Snippet } from 'svelte'
    import { type SeoContext } from '$lib/components/contexts/Seo/type'
    import { setSeoContext } from '$lib/components/contexts/Seo/Seo.context'

    // Props using Svelte 5 $props typing
    const { seo, children } = $props<{
        seo: SeoContext
        children?: Snippet
    }>()

    // Expose a typed API in context so pages can mutate SEO values
    setSeoContext(seo)
</script>

{@render children?.()}
