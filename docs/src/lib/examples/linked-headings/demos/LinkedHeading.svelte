<script lang="ts">
    import type { SvelteMarkdownOptions } from '@humanspeak/svelte-markdown'
    import type { Snippet } from 'svelte'

    interface Props {
        depth: number
        raw: string
        text: string
        options: SvelteMarkdownOptions
        slug: (val: string) => string
        children?: Snippet
    }

    const { depth, text, options, slug, children }: Props = $props()

    // Resolve the heading id the same way svelte-markdown's default
    // renderer would — honouring `headerIds` and `headerPrefix` so this
    // component drops in without surprises when the consumer toggles
    // those options.
    const id = $derived(options.headerIds ? options.headerPrefix + slug(text) : undefined)
</script>

<svelte:element this={`h${depth}`} {id} class="lh-heading">
    <a href={id ? `#${id}` : undefined} class="lh-link">
        {@render children?.()}
        {#if id}
            <span class="lh-icon" aria-hidden="true">🔗</span>
        {/if}
    </a>
</svelte:element>

<style>
    :global(.lh-heading) {
        position: relative;
    }
    :global(.lh-link) {
        color: inherit;
        text-decoration: none;
    }
    :global(.lh-link:hover) {
        text-decoration: underline;
    }
    :global(.lh-icon) {
        margin-left: 8px;
        font-size: 0.7em;
        opacity: 0;
        transition: opacity 0.15s;
        color: var(--brut-accent);
    }
    :global(.lh-heading:hover .lh-icon),
    :global(.lh-link:focus-visible .lh-icon) {
        opacity: 1;
    }
</style>
