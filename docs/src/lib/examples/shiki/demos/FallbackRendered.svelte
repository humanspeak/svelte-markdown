<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import {
        createShikiHighlighter,
        ShikiCode,
        SHIKI_CONTEXT_KEY
    } from '@humanspeak/svelte-markdown/extensions'
    import { DemoSplitV2 } from '@humanspeak/docs-kit'
    import { setContext } from 'svelte'
    import ts from 'shiki/langs/typescript.mjs'
    import githubDark from 'shiki/themes/github-dark.mjs'

    // Only `typescript` is registered here — everything else degrades safely.
    setContext(SHIKI_CONTEXT_KEY, createShikiHighlighter({ langs: [ts], themes: [githubDark] }))

    interface CodeRenderers extends Renderers {
        code: RendererComponent
    }
    const renderers: Partial<CodeRenderers> = {
        code: ShikiCode
    }

    // `rust` is not registered, so it falls back to an escaped
    // <pre class="shiki-fallback"> instead of throwing mid-stream. The
    // untrusted lang string is only ever emitted as an escaped data-lang.
    const source = `### Registered language (\`ts\`)

\`\`\`ts
const total: number = [1, 2, 3].reduce((a, b) => a + b, 0)
\`\`\`

### Unregistered language (\`rust\`) — safe escaped fallback

\`\`\`rust
fn main() {
    let markup = "<b>bold</b> & <i>italic</i>";
    println!("{markup}");
}
\`\`\``
</script>

<DemoSplitV2 leftLabel="SOURCE" leftTone="markdown" rightLabel="PREVIEW" rightTone="diagrams">
    {#snippet left()}
        <pre class="md-source">{source}</pre>
    {/snippet}
    {#snippet right()}
        <div class="md-preview prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown {source} {renderers} />
        </div>
    {/snippet}
</DemoSplitV2>

<style>
    .md-source {
        margin: 0;
        white-space: pre-wrap;
        color: var(--brut-ink, var(--foreground, inherit));
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.7;
    }
    .md-preview {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2, var(--muted-foreground, inherit));
    }
    .md-preview :global(h1),
    .md-preview :global(h2),
    .md-preview :global(h3),
    .md-preview :global(h4) {
        color: var(--brut-ink, var(--foreground, inherit));
        letter-spacing: -0.02em;
    }
    .md-preview :global(pre.shiki),
    .md-preview :global(pre.shiki-fallback) {
        padding: 12px;
        border-radius: 6px;
        overflow-x: auto;
        font-size: 12px;
        line-height: 1.6;
    }
    .md-preview :global(pre.shiki-fallback) {
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.08));
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.18));
        color: var(--brut-ink, var(--foreground, inherit));
    }
</style>
