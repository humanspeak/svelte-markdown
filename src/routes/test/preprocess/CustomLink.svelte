<script lang="ts">
    const { href, children } = $props<{ href: string; children?: import('svelte').Snippet }>()
</script>

<a data-testid="custom-link" {href} rel="external">{@render children?.()}</a>
