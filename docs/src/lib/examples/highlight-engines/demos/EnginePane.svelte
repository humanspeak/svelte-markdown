<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers, StreamingChunk } from '@humanspeak/svelte-markdown'
    import {
        HIGHLIGHT_CONTEXT_KEY,
        HighlightedCode,
        type CodeHighlighter
    } from '@humanspeak/svelte-markdown/extensions/highlight'
    import { setContext } from 'svelte'

    interface Props {
        /** Any engine — Shiki, TanStack Highlight, or your own `CodeHighlighter`. */
        highlighter: CodeHighlighter
    }

    const { highlighter }: Props = $props()

    // One renderer, one context key, any engine. Each pane injects its own
    // highlighter via context so two engines can live on the same page with
    // no module-singleton cross-talk.
    // svelte-ignore state_referenced_locally
    setContext(HIGHLIGHT_CONTEXT_KEY, highlighter)

    interface CodeRenderers extends Renderers {
        code: RendererComponent
    }
    const renderers: Partial<CodeRenderers> = { code: HighlightedCode }

    let markdown:
        | {
              writeChunk: (chunk: StreamingChunk) => void
              resetStream: (nextSource?: string) => void
          }
        | undefined = $state()
    export const writeChunk = (chunk: StreamingChunk): void => markdown?.writeChunk(chunk)
    export const resetStream = (nextSource = ''): void => markdown?.resetStream(nextSource)
</script>

<div class="pane-out prose prose-sm dark:prose-invert max-w-none">
    <SvelteMarkdown bind:this={markdown} source="" streaming={true} {renderers} />
</div>

<style>
    /* No height cap: the pane grows with the response so the whole rendered
       output is visible without an inner scrollbar. */
    .pane-out {
        flex: 1;
        padding: 12px 14px;
        color: var(--brut-ink-2);
    }
    .pane-out :global(h1),
    .pane-out :global(h2),
    .pane-out :global(h3) {
        color: var(--brut-ink);
        letter-spacing: -0.02em;
        margin-top: 0.8em;
        margin-bottom: 0.4em;
    }
    /* Demo panes are half-width; keep headings proportionate. */
    .pane-out :global(h1) {
        font-size: 1.25rem;
    }
    .pane-out :global(h2) {
        font-size: 1.05rem;
    }
    .pane-out :global(h3) {
        font-size: 0.95rem;
    }
    .pane-out :global(:not(pre) > code) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
    }
    /* Both engines emit a <pre>; Shiki carries its own inline background,
       TanStack reads --th-background from the theme stylesheet. */
    .pane-out :global(pre) {
        margin: 12px 0;
        padding: 12px 14px;
        border: 1px solid var(--brut-rule);
        overflow-x: auto;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        line-height: 1.65;
        border-radius: 0;
    }
    .pane-out :global(pre.th-code) {
        background: var(--th-background);
        color: var(--th-token);
    }
    .pane-out :global(pre.highlight-fallback) {
        background: var(--brut-bg-2);
        color: var(--brut-ink);
    }
    .pane-out :global(pre code) {
        background: transparent;
        border: 0;
        padding: 0;
    }
</style>
