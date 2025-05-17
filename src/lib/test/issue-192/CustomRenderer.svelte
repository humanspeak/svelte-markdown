<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        href?: string
        title?: string
    }

    const { href = '', title = '', children }: Props = $props()
</script>

<a {href} {title} class="custom-link">
    {@render children?.()}
</a>
