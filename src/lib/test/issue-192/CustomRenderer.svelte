<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        href?: string
        title?: string
        text?: string
    }

    const { href = '', title = '', text = '', children }: Props = $props()
</script>

<a {href} {title} class="custom-link">
    {#if children}
        {@render children?.()}
    {:else}
        {text}
    {/if}
</a>
