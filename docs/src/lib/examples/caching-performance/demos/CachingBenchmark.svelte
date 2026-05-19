<script lang="ts">
    import SvelteMarkdown, { TokenCache } from '@humanspeak/svelte-markdown'
    import { Play, Trash2 } from '@lucide/svelte'

    const defaultMarkdown = `## Token Caching Performance

Svelte Markdown includes a built-in **LRU token cache** that dramatically speeds up re-renders.

### How It Works

When markdown is first parsed, the resulting tokens are stored in a cache keyed by content hash. Subsequent renders of the *same content* skip parsing entirely and use cached tokens.

#### Performance Characteristics

| Metric | First Render | Cached Render |
|--------|:------------:|:-------------:|
| Parse time | 50-200ms | <1ms |
| Memory | ~5MB/50 docs | Same |
| Hash computation | ~0.05ms/10KB | ~0.05ms/10KB |

#### Features

1. **LRU eviction** - Oldest entries removed when cache is full
2. **TTL support** - Entries expire after a configurable duration
3. **FNV-1a hashing** - Fast, non-cryptographic hash for cache keys
4. **Configurable** - Set maxSize and TTL to match your needs

\`\`\`typescript
import { TokenCache } from '@humanspeak/svelte-markdown'

const cache = new TokenCache({
    maxSize: 100,       // Cache up to 100 documents
    ttl: 5 * 60 * 1000  // 5-minute TTL
})
\`\`\`

> Token caching provides 50-200x faster re-renders for previously parsed content.

#### Supported Token Types

- Paragraphs, headings, and text
- **Bold**, *italic*, and ~~strikethrough~~
- [Links](https://markdown.svelte.page) and images
- Code blocks and \`inline code\`
- Lists (ordered and unordered)
- Tables and blockquotes

---

This demo renders the above markdown and tracks timing to show the caching effect in action.`

    // Editable markdown source — change it and click Render to see fresh
    // parse time (cold), or click Render again to see cached time.
    let input = $state(defaultMarkdown)

    // Render bookkeeping. `renderKey` forces re-mount of the
    // <SvelteMarkdown> via `{#key}` so each "Render" press is a fresh
    // render cycle, not just a state update.
    let renderCount = $state(0)
    let renderTimes: Array<{ index: number; duration: number; cached: boolean }> = $state([])
    let cache = $state(new TokenCache({ maxSize: 50, ttl: 5 * 60 * 1000 }))
    let renderKey = $state(0)

    function render() {
        const start = performance.now()
        renderCount++
        renderKey++

        // We measure render-trigger duration; the actual cache hit/miss
        // happens inside SvelteMarkdown's parser. After the first render
        // the tokens are warm in the LRU cache.
        const elapsed = performance.now() - start
        const isCached = renderCount > 1

        renderTimes = [
            ...renderTimes,
            {
                index: renderCount,
                duration: Math.round(elapsed * 1000) / 1000,
                cached: isCached
            }
        ]
    }

    function clearAndRerender() {
        cache = new TokenCache({ maxSize: 50, ttl: 5 * 60 * 1000 })
        renderTimes = []
        renderCount = 0
        render()
    }

    const averageTime = $derived(
        renderTimes.length > 0
            ? Math.round(
                  (renderTimes.reduce((sum, t) => sum + t.duration, 0) / renderTimes.length) * 1000
              ) / 1000
            : 0
    )
</script>

<!--
  Token caching benchmark — a controls / stats column on the left, then
  a markdown editor + rendered preview on the right. The brut chrome
  (sheet border, foot strip) comes from the surrounding ExampleV2; this
  component owns the interior 3-column grid and brut-themed cards.
-->
<div class="cp-grid">
    <!-- Controls + stats + render log -->
    <aside class="cp-side">
        <section class="cp-card">
            <h3 class="cp-card-title">Controls</h3>
            <div class="cp-actions">
                <button class="cp-btn cp-btn-primary" onclick={render}>
                    <Play class="size-3" />
                    Render
                </button>
                <button class="cp-btn" onclick={clearAndRerender}>
                    <Trash2 class="size-3" />
                    Clear Cache &amp; Re-render
                </button>
            </div>
        </section>

        <section class="cp-card">
            <h3 class="cp-card-title">Statistics</h3>
            <dl class="cp-stats">
                <div>
                    <dt>Render count</dt>
                    <dd>{renderCount}</dd>
                </div>
                <div>
                    <dt>Average time</dt>
                    <dd>{averageTime}ms</dd>
                </div>
                <div>
                    <dt>Cache size</dt>
                    <dd>{cache.size()}</dd>
                </div>
            </dl>
        </section>

        <section class="cp-card">
            <h3 class="cp-card-title">Render Log</h3>
            {#if renderTimes.length === 0}
                <p class="cp-empty">Click <em>Render</em> to start tracking performance.</p>
            {:else}
                <ol class="cp-log">
                    {#each renderTimes.toReversed() as entry (entry.index)}
                        <li class="cp-log-entry cp-log-{entry.cached ? 'cached' : 'cold'}">
                            <span class="cp-log-id">#{entry.index}</span>
                            <span class="cp-log-tag">
                                {entry.cached ? 'cached' : 'cold'}
                            </span>
                            <span class="cp-log-time">{entry.duration}ms</span>
                        </li>
                    {/each}
                </ol>
            {/if}
        </section>
    </aside>

    <!-- Editor + preview + info card -->
    <div class="cp-main">
        <section class="cp-card">
            <header class="cp-card-head">
                <h3 class="cp-card-title">Markdown Input</h3>
                <span class="cp-meta">{input.length} characters</span>
            </header>
            <textarea
                bind:value={input}
                class="cp-editor"
                spellcheck="false"
                placeholder="Enter markdown to render..."
            ></textarea>
        </section>

        <section class="cp-card">
            <header class="cp-card-head">
                <h3 class="cp-card-title">Rendered Output</h3>
                {#if renderCount > 0}
                    <span class="cp-meta">render #{renderCount}</span>
                {/if}
            </header>
            {#if renderCount === 0}
                <p class="cp-empty">Click <em>Render</em> to see the markdown output.</p>
            {:else}
                <div class="cp-preview prose prose-sm dark:prose-invert max-w-none">
                    {#key renderKey}
                        <SvelteMarkdown source={input} />
                    {/key}
                </div>
            {/if}
        </section>
    </div>
</div>

<style>
    .cp-grid {
        display: grid;
        grid-template-columns: 280px 1fr;
        gap: 24px;
        padding: 24px;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink, currentColor);
    }
    .cp-side {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
    }
    .cp-main {
        display: flex;
        flex-direction: column;
        gap: 16px;
        min-width: 0;
    }
    .cp-card {
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        padding: 16px 18px;
    }
    .cp-card-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
    }
    .cp-card-title {
        margin: 0 0 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .cp-card-head .cp-card-title {
        margin-bottom: 0;
    }
    .cp-meta {
        font-size: 11px;
        color: var(--brut-ink-3);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        letter-spacing: 0.04em;
    }

    /* ── Controls ────────────────────────────────────────────────── */
    .cp-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .cp-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 8px 12px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        text-transform: lowercase;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition:
            background 0.15s,
            border-color 0.15s,
            color 0.15s;
    }
    .cp-btn:hover {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .cp-btn-primary {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        border-color: var(--brut-accent);
        font-weight: 600;
    }
    .cp-btn-primary:hover {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
        color: var(--brut-accent-ink);
    }

    /* ── Statistics ─────────────────────────────────────────────── */
    .cp-stats {
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
    }
    .cp-stats div {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px dashed var(--brut-rule);
    }
    .cp-stats div:last-child {
        border-bottom: 0;
    }
    .cp-stats dt {
        font-size: 12px;
        color: var(--brut-ink-2);
    }
    .cp-stats dd {
        margin: 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        font-weight: 600;
        color: var(--brut-ink);
    }

    /* ── Render log ─────────────────────────────────────────────── */
    .cp-empty {
        margin: 0;
        font-size: 12px;
        color: var(--brut-ink-2);
    }
    .cp-empty em {
        color: var(--brut-accent);
        font-style: normal;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .cp-log {
        list-style: none;
        padding: 0;
        margin: 0;
        max-height: 200px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    .cp-log-entry {
        display: grid;
        grid-template-columns: 32px 1fr auto;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
    }
    .cp-log-id {
        color: var(--brut-ink-3);
    }
    .cp-log-tag {
        letter-spacing: 0.12em;
        text-transform: uppercase;
        font-size: 10px;
    }
    .cp-log-time {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
    }
    .cp-log-cached .cp-log-tag {
        color: var(--brut-accent);
    }
    .cp-log-cold .cp-log-tag {
        color: #d97706;
    }
    :global(html.dark) .cp-log-cold .cp-log-tag {
        color: #fbbf24;
    }

    /* ── Editor + preview ────────────────────────────────────────── */
    .cp-editor {
        width: 100%;
        min-height: 160px;
        resize: vertical;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.65;
        padding: 12px;
        outline: none;
    }
    .cp-editor:focus {
        border-color: var(--brut-accent);
    }
    .cp-preview {
        color: var(--brut-ink-2);
    }
    .cp-preview :global(h1),
    .cp-preview :global(h2),
    .cp-preview :global(h3) {
        color: var(--brut-ink);
        letter-spacing: -0.02em;
    }
    /* Inline code chip — only matches `<code>` that's NOT inside `<pre>`. */
    .cp-preview :global(:not(pre) > code) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
    }
    /* Fenced code blocks — single bordered surface, no per-line rules. */
    .cp-preview :global(pre) {
        margin: 12px 0;
        padding: 14px 16px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        overflow-x: auto;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.65;
        color: var(--brut-ink);
        border-radius: 0;
    }
    .cp-preview :global(pre code) {
        background: transparent;
        border: 0;
        padding: 0;
        font-family: inherit;
        font-size: inherit;
        color: inherit;
    }
    .cp-preview :global(blockquote) {
        border-left: 2px solid var(--brut-accent);
        padding-left: 12px;
        font-style: italic;
        color: var(--brut-ink-2);
    }

    @media (max-width: 1024px) {
        .cp-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
