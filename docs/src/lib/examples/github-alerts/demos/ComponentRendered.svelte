<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { AlertRenderer, markedAlert } from '@humanspeak/svelte-markdown/extensions'

    const markdown = `## GitHub Alerts

GitHub-style alerts highlight critical information in documentation.

> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

### Mixed Content

Regular markdown works alongside alerts: **bold**, *italic*, and \`inline code\`.`

    // The markedAlert extension parses `> [!NOTE]` blocks into `alert`
    // tokens; the AlertRenderer component handles their HTML output.
    // Render with the standard `renderers` prop for app-wide reuse.
    interface AlertRenderers extends Renderers {
        alert: RendererComponent
    }
    const renderers: Partial<AlertRenderers> = {
        alert: AlertRenderer
    }
</script>

<!--
  GitHub-style alerts via the built-in `AlertRenderer` component. Best
  when alerts need to look identical across multiple pages and you'd
  rather centralise the styling.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} extensions={[markedAlert()]} {renderers} />
</div>

<style>
    /* AlertRenderer outputs `<div class="markdown-alert markdown-alert-{type}">`
       with `.markdown-alert-title` and a `<p>` for the body. Style with brut
       tokens so the five alert types stay distinguishable without leaning on
       a hard-coded dark palette. */
    :global(.markdown-alert) {
        padding: 8px 14px;
        margin: 14px 0;
        border-left: 3px solid var(--brut-accent, currentColor);
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.06));
        color: var(--brut-ink, currentColor);
    }
    :global(.markdown-alert-title) {
        font-weight: 600;
        margin: 0 0 4px;
        font-size: 0.85rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--brut-accent, currentColor);
    }
    :global(.markdown-alert p) {
        margin: 0;
    }
    /* Per-type accents that read cleanly on both light and dark brut
       surfaces. Borders + titles get the type colour; the body stays on
       the brut bg-2 so the text remains legible. */
    :global(.markdown-alert-note) {
        border-color: #2563eb;
    }
    :global(.markdown-alert-note .markdown-alert-title) {
        color: #2563eb;
    }
    :global(.markdown-alert-tip) {
        border-color: #16a34a;
    }
    :global(.markdown-alert-tip .markdown-alert-title) {
        color: #16a34a;
    }
    :global(.markdown-alert-important) {
        border-color: #9333ea;
    }
    :global(.markdown-alert-important .markdown-alert-title) {
        color: #9333ea;
    }
    :global(.markdown-alert-warning) {
        border-color: #d97706;
    }
    :global(.markdown-alert-warning .markdown-alert-title) {
        color: #d97706;
    }
    :global(.markdown-alert-caution) {
        border-color: #dc2626;
    }
    :global(.markdown-alert-caution .markdown-alert-title) {
        color: #dc2626;
    }
    :global(html.dark .markdown-alert-note) {
        border-color: #60a5fa;
    }
    :global(html.dark .markdown-alert-note .markdown-alert-title) {
        color: #60a5fa;
    }
    :global(html.dark .markdown-alert-tip) {
        border-color: #4ade80;
    }
    :global(html.dark .markdown-alert-tip .markdown-alert-title) {
        color: #4ade80;
    }
    :global(html.dark .markdown-alert-important) {
        border-color: #c084fc;
    }
    :global(html.dark .markdown-alert-important .markdown-alert-title) {
        color: #c084fc;
    }
    :global(html.dark .markdown-alert-warning) {
        border-color: #fbbf24;
    }
    :global(html.dark .markdown-alert-warning .markdown-alert-title) {
        color: #fbbf24;
    }
    :global(html.dark .markdown-alert-caution) {
        border-color: #f87171;
    }
    :global(html.dark .markdown-alert-caution .markdown-alert-title) {
        color: #f87171;
    }
</style>
