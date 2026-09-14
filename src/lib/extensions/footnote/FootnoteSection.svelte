<script lang="ts">
    import {
        getFootnoteDefinitionId,
        getFootnoteFragment,
        getFootnoteReferenceId
    } from '$lib/utils/footnote-render-metadata.js'

    interface Footnote {
        id: string
        text: string
        backrefs?: readonly string[]
    }

    interface Props {
        footnotes: readonly Footnote[]
    }

    const { footnotes }: Props = $props()
    const uniqueFootnotes = $derived.by(() => {
        // This is ephemeral scratch state rebuilt for each pure derivation evaluation.
        // trunk-ignore(eslint/svelte/prefer-svelte-reactivity)
        const seen = new Set<string>()

        return footnotes.filter((footnote) => {
            if (seen.has(footnote.id)) return false
            seen.add(footnote.id)
            return true
        })
    })
</script>

{#if uniqueFootnotes.length > 0}
    <section class="footnotes" role="doc-endnotes">
        <ol>
            {#each uniqueFootnotes as { id, text, backrefs } (id)}
                {@const resolvedBackrefs = backrefs ?? [getFootnoteReferenceId(id)]}
                <li id={getFootnoteDefinitionId(id)}>
                    <p>
                        {text}
                        {#each resolvedBackrefs as backref, index (backref)}
                            <a
                                href={getFootnoteFragment(backref)}
                                class="footnote-backref"
                                role="doc-backlink"
                                aria-label={resolvedBackrefs.length > 1
                                    ? `Back to reference ${index + 1} for footnote ${id}`
                                    : `Back to reference for footnote ${id}`}>&#8617;</a
                            >
                        {/each}
                    </p>
                </li>
            {/each}
        </ol>
    </section>
{/if}
