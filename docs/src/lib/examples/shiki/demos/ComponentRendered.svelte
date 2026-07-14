<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import {
        createShikiHighlighter,
        ShikiCode,
        SHIKI_CONTEXT_KEY
    } from '@humanspeak/svelte-markdown/extensions/shiki'
    import { DemoSplitV2 } from '@humanspeak/docs-kit'
    import { setContext } from 'svelte'
    import js from 'shiki/langs/javascript.mjs'
    import json from 'shiki/langs/json.mjs'
    import ts from 'shiki/langs/typescript.mjs'
    import githubDark from 'shiki/themes/github-dark.mjs'

    // Per-subtree injection via Svelte context — isolated from any other
    // highlighter on the page (no global module-singleton cross-talk).
    // ShikiCode reads this context at init and highlights synchronously.
    setContext(
        SHIKI_CONTEXT_KEY,
        createShikiHighlighter({ langs: [js, ts, json], themes: [githubDark] })
    )

    // ShikiCode is a drop-in for the built-in `code` renderer (same lang/text
    // props), so only fenced blocks are affected — inline `code` is untouched.
    interface CodeRenderers extends Renderers {
        code: RendererComponent
    }
    const renderers: Partial<CodeRenderers> = {
        code: ShikiCode
    }

    const defaultMarkdown = `## Shiki Highlighting

Fenced blocks render through Shiki synchronously — no async work, so
**streaming stays enabled**.

\`\`\`ts
interface User {
    id: number
    name: string
}

const greet = (user: User): string => \`Hello, \${user.name}!\`
\`\`\`

\`\`\`json
{ "langs": ["javascript", "typescript", "json"], "theme": "github-dark" }
\`\`\`

Inline \`code\` uses the codespan renderer and is left untouched.`

    // Debounced live editor: `input` tracks the textarea verbatim, `source`
    // is what SvelteMarkdown renders.
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            source = input
        }, 300)
    }
</script>

<DemoSplitV2 leftLabel="EDITOR" leftTone="markdown" rightLabel="PREVIEW" rightTone="diagrams">
    {#snippet left()}
        <textarea
            value={input}
            oninput={handleInput}
            class="md-editor"
            spellcheck="false"
            placeholder="Type markdown with ```ts / ```json code blocks..."></textarea>
    {/snippet}
    {#snippet right()}
        <div class="md-preview prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown {source} {renderers} />
        </div>
    {/snippet}
</DemoSplitV2>

<style>
    .md-editor {
        width: 100%;
        height: 100%;
        min-height: 360px;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--brut-ink, var(--foreground, inherit));
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.7;
        padding: 0;
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
    /* Shiki emits <pre class="shiki"> with its own theme background. */
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
    }
    .md-preview :global(:not(pre) > code) {
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.08));
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.18));
        padding: 0 4px;
        font-size: 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
</style>
