<script lang="ts">
    import type { HtmlSnippetProps } from '$lib/types.js'

    const { attributes = {}, children }: HtmlSnippetProps = $props()
</script>

<span data-testid="widget" data-label={attributes.label}>{@render children?.()}</span>
