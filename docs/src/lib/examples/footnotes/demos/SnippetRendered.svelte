<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { markedFootnote } from '@humanspeak/svelte-markdown/extensions'

    type FootnoteRefProps = {
        id: string
    }

    type FootnoteSectionProps = {
        footnotes: { id: string; text: string }[]
    }

    const markdown = `## Footnotes

Footnotes let you add references without cluttering the main text.

Here is a statement[^1] that needs a citation. You can also use named footnotes[^note] for clarity.

Multiple references[^2] can appear throughout the document, and they all link to the definitions at the bottom.

### Technical Writing

When documenting APIs, footnotes[^api] help explain edge cases without breaking the flow of the main content.

[^1]: This is the first footnote with a numeric identifier.
[^note]: Named footnotes use descriptive identifiers instead of numbers.
[^2]: Multiple footnotes are collected into a single section at the end.
[^api]: API footnotes can reference external documentation or implementation details.`
</script>

<!--
  Snippet overrides for both footnote tokens — `footnoteRef` renders
  each `[^id]` reference and `footnoteSection` renders the gathered
  definition list. Full control over the markup without a separate
  component file.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} extensions={[markedFootnote()]}>
        {#snippet footnoteRef(props: FootnoteRefProps)}
            <sup class="fn-ref">
                <a href="#fn-{props.id}" id="fnref-{props.id}">[{props.id}]</a>
            </sup>
        {/snippet}

        {#snippet footnoteSection(props: FootnoteSectionProps)}
            <section class="fn-section" role="doc-endnotes">
                <h3 class="fn-section-title">Footnotes</h3>
                <ol>
                    {#each props.footnotes as fn (fn.id)}
                        <li id="fn-{fn.id}">
                            <span class="fn-id">{fn.id}</span>
                            <span class="fn-text">{fn.text}</span>
                            <a href="#fnref-{fn.id}" class="fn-back" aria-label="Back to reference"
                                >↩</a
                            >
                        </li>
                    {/each}
                </ol>
            </section>
        {/snippet}
    </SvelteMarkdown>
</div>

<style>
    /* Snippet-style footnote styling — visually distinct from the
       component variant. Reference uses bracketed `[id]` instead of
       plain superscript; the section gets a brut-themed heading and
       per-id label chips. */
    :global(.fn-ref a) {
        color: var(--brut-accent);
        text-decoration: none;
        font-weight: 600;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.75rem;
    }
    :global(.fn-ref a:hover) {
        text-decoration: underline;
    }
    :global(.fn-section) {
        margin-top: 2rem;
        padding: 12px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
    }
    :global(.fn-section-title) {
        margin: 0 0 8px;
        font-size: 11px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-weight: 600;
    }
    :global(.fn-section ol) {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    :global(.fn-section li) {
        display: flex;
        gap: 10px;
        align-items: baseline;
        padding: 4px 0;
        font-size: 0.875rem;
        color: var(--brut-ink-2);
    }
    :global(.fn-id) {
        display: inline-block;
        padding: 1px 6px;
        border: 1px solid var(--brut-accent);
        color: var(--brut-accent);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        font-weight: 600;
        flex-shrink: 0;
    }
    :global(.fn-text) {
        flex: 1;
    }
    :global(.fn-back) {
        color: var(--brut-accent);
        text-decoration: none;
        margin-left: 4px;
    }
    :global(.fn-back:hover) {
        text-decoration: underline;
    }
</style>
