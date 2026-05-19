<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { markedAlert } from '@humanspeak/svelte-markdown/extensions'
    import { AlertCircle, AlertTriangle, Info, Lightbulb, ShieldAlert } from '@lucide/svelte'

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
</script>

<!--
  Snippet override for the `alert` token from the markedAlert extension.
  Each `> [!TYPE]` block in markdown gets an `{ alertType, text }`
  callback into this snippet — full control over the rendered DOM
  inline, no separate component file needed.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown} extensions={[markedAlert()]}>
        {#snippet alert(props)}
            <aside class="ga-alert ga-alert-{props.alertType}" role="note">
                <span class="ga-alert-icon">
                    {#if props.alertType === 'note'}
                        <Info class="size-4" />
                    {:else if props.alertType === 'tip'}
                        <Lightbulb class="size-4" />
                    {:else if props.alertType === 'important'}
                        <AlertCircle class="size-4" />
                    {:else if props.alertType === 'warning'}
                        <AlertTriangle class="size-4" />
                    {:else}
                        <ShieldAlert class="size-4" />
                    {/if}
                </span>
                <div class="ga-alert-body">
                    <span class="ga-alert-title">{props.alertType}</span>
                    <p>{props.text}</p>
                </div>
            </aside>
        {/snippet}
    </SvelteMarkdown>
</div>

<style>
    /* Snippet-override styling — visually distinct from the component
       variant so the reader can compare the two side-by-side. Uses a
       horizontal layout with a leading lucide icon and the type label as
       a small-caps badge on the title row. */
    :global(.ga-alert) {
        display: flex;
        gap: 12px;
        padding: 10px 14px;
        margin: 14px 0;
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.06));
        align-items: flex-start;
    }
    :global(.ga-alert-icon) {
        flex-shrink: 0;
        color: var(--brut-accent);
        margin-top: 2px;
    }
    :global(.ga-alert-body) {
        flex: 1;
    }
    :global(.ga-alert-body p) {
        margin: 0;
        color: var(--brut-ink-2, currentColor);
    }
    :global(.ga-alert-title) {
        display: inline-block;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 600;
        margin-bottom: 4px;
        padding: 2px 6px;
        border: 1px solid var(--brut-accent);
        color: var(--brut-accent);
    }
    /* Type-specific accents on the icon + title. The wrapper stays brut-bg-2
       so the body text remains comfortable to read across both themes. */
    :global(.ga-alert-note .ga-alert-icon),
    :global(.ga-alert-note .ga-alert-title) {
        color: #2563eb;
        border-color: #2563eb;
    }
    :global(.ga-alert-tip .ga-alert-icon),
    :global(.ga-alert-tip .ga-alert-title) {
        color: #16a34a;
        border-color: #16a34a;
    }
    :global(.ga-alert-important .ga-alert-icon),
    :global(.ga-alert-important .ga-alert-title) {
        color: #9333ea;
        border-color: #9333ea;
    }
    :global(.ga-alert-warning .ga-alert-icon),
    :global(.ga-alert-warning .ga-alert-title) {
        color: #d97706;
        border-color: #d97706;
    }
    :global(.ga-alert-caution .ga-alert-icon),
    :global(.ga-alert-caution .ga-alert-title) {
        color: #dc2626;
        border-color: #dc2626;
    }
    :global(html.dark .ga-alert-note .ga-alert-icon),
    :global(html.dark .ga-alert-note .ga-alert-title) {
        color: #60a5fa;
        border-color: #60a5fa;
    }
    :global(html.dark .ga-alert-tip .ga-alert-icon),
    :global(html.dark .ga-alert-tip .ga-alert-title) {
        color: #4ade80;
        border-color: #4ade80;
    }
    :global(html.dark .ga-alert-important .ga-alert-icon),
    :global(html.dark .ga-alert-important .ga-alert-title) {
        color: #c084fc;
        border-color: #c084fc;
    }
    :global(html.dark .ga-alert-warning .ga-alert-icon),
    :global(html.dark .ga-alert-warning .ga-alert-title) {
        color: #fbbf24;
        border-color: #fbbf24;
    }
    :global(html.dark .ga-alert-caution .ga-alert-icon),
    :global(html.dark .ga-alert-caution .ga-alert-title) {
        color: #f87171;
        border-color: #f87171;
    }
</style>
