<script lang="ts">
    import type { Snippet } from 'svelte'
    import type { SvelteMarkdownOptions } from '$lib/types.js'

    interface Props {
        depth: number
        raw: string
        text: string
        options: SvelteMarkdownOptions
        slug: (val: string) => string // eslint-disable-line no-unused-vars
        children?: Snippet
    }

    const { depth, raw, text, options, slug, children }: Props = $props()

    const id = $derived(options.headerIds ? options.headerPrefix + slug(text) : undefined)
</script>

{#if depth === 1}
    <h1 {id}>{@render children?.()}</h1>
{:else if depth === 2}
    <h2 {id}>{@render children?.()}</h2>
{:else if depth === 3}
    <h3 {id}>{@render children?.()}</h3>
{:else if depth === 4}
    <h4 {id}>{@render children?.()}</h4>
{:else if depth === 5}
    <h5 {id}>{@render children?.()}</h5>
{:else if depth === 6}
    <h6 {id}>{@render children?.()}</h6>
{:else}
    {raw}
{/if}
