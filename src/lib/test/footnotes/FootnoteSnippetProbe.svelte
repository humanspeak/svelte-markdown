<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { markedFootnote } from '$lib/extensions/footnote/markedFootnote.js'

    interface FootnoteRefProps {
        id: string
        referenceId?: string
        [key: string]: unknown
    }

    interface Footnote {
        id: string
        text: string
        backrefs?: readonly string[]
    }

    interface FootnoteSectionProps {
        footnotes: readonly Footnote[]
        [key: string]: unknown
    }

    const { source }: { source: string } = $props()
    const extensions = [markedFootnote()]
</script>

<SvelteMarkdown {source} {extensions}>
    {#snippet footnoteRef(props: FootnoteRefProps)}
        <span
            data-testid="footnote-ref-probe"
            data-id={props.id}
            data-reference-id={props.referenceId}
            data-prop-keys={Object.keys(props).sort().join(',')}>{props.id}</span
        >
    {/snippet}

    {#snippet footnoteSection(props: FootnoteSectionProps)}
        <div
            data-testid="footnote-section-probe"
            data-footnotes={JSON.stringify(props.footnotes)}
            data-prop-keys={Object.keys(props).sort().join(',')}
        ></div>
    {/snippet}
</SvelteMarkdown>
