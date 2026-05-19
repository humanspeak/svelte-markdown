<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import {
        FootnoteRef,
        FootnoteSection,
        markedFootnote
    } from '@humanspeak/svelte-markdown/extensions'

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

    // The markedFootnote extension parses `[^id]` references and
    // `[^id]: text` definitions into `footnoteRef` and `footnoteSection`
    // tokens. The built-in components handle the bidirectional linking.
    interface FootnoteRenderers extends Renderers {
        footnoteRef: RendererComponent
        footnoteSection: RendererComponent
    }
    const renderers: Partial<FootnoteRenderers> = {
        footnoteRef: FootnoteRef,
        footnoteSection: FootnoteSection
    }
</script>

<!--
  Footnotes via the built-in `FootnoteRef` + `FootnoteSection`
  components. Best for academic / long-form writing that needs
  consistent footnote styling across many pages.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} extensions={[markedFootnote()]} {renderers} />
</div>

<style>
    /* FootnoteRef renders as `<sup class="footnote-ref">...<a>id</a></sup>`
       and FootnoteSection renders an `<ol>` of definitions with
       `footnote-backref` ↩ anchors. Brut tokens keep both surfaces
       legible in light and dark themes. */
    :global(.footnote-ref a),
    :global(.footnote-backref) {
        color: var(--brut-accent);
        text-decoration: none;
    }
    :global(.footnote-ref a:hover),
    :global(.footnote-backref:hover) {
        text-decoration: underline;
    }
    :global(.footnotes) {
        margin-top: 2rem;
        padding-top: 1rem;
        border-top: 1px solid var(--brut-rule);
        font-size: 0.875rem;
        color: var(--brut-ink-2);
    }
    :global(.footnotes ol) {
        padding-left: 1.5rem;
    }
    :global(.footnote-backref) {
        margin-left: 4px;
    }
</style>
