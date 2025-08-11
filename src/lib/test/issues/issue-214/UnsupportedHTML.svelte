<script lang="ts">
    import type { Snippet } from 'svelte'

    const { children, tag }: { children?: Snippet; tag: string } = $props()
</script>

&lt;{tag}&gt;{@render children?.()}&lt;/{tag}&gt;
