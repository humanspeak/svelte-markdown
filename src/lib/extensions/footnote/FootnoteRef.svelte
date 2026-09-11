<script lang="ts">
    import {
        getFootnoteDefinitionId,
        getFootnoteFragment,
        getFootnoteReferenceId
    } from '$lib/utils/footnote-render-metadata.js'

    interface Props {
        id: string
        referenceId?: string
    }

    const { id, referenceId = undefined }: Props = $props()
    const resolvedReferenceId = $derived(referenceId ?? getFootnoteReferenceId(id))
    const definitionFragment = $derived(getFootnoteFragment(getFootnoteDefinitionId(id)))
</script>

<sup class="footnote-ref"><a href={definitionFragment} id={resolvedReferenceId}>{id}</a></sup>
