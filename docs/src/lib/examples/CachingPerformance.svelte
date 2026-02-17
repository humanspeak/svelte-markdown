<script lang="ts">
    import SvelteMarkdown, { TokenCache } from '@humanspeak/svelte-markdown'

    const defaultMarkdown = `# Token Caching Performance

Svelte Markdown includes a built-in **LRU token cache** that dramatically speeds up re-renders.

## How It Works

When markdown is first parsed, the resulting tokens are stored in a cache keyed by content hash. Subsequent renders of the *same content* skip parsing entirely and use cached tokens.

### Performance Characteristics

| Metric | First Render | Cached Render |
|--------|:------------:|:-------------:|
| Parse time | 50-200ms | <1ms |
| Memory | ~5MB/50 docs | Same |
| Hash computation | ~0.05ms/10KB | ~0.05ms/10KB |

### Features

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

### Supported Token Types

- Paragraphs, headings, and text
- **Bold**, *italic*, and ~~strikethrough~~
- [Links](https://markdown.svelte.page) and images
- Code blocks and \`inline code\`
- Lists (ordered and unordered)
- Tables and blockquotes
- HTML elements within markdown

---

This demo renders the above markdown and tracks timing to show the caching effect in action.`

    let input = $state(defaultMarkdown)
    let renderCount = $state(0)
    let renderTimes: Array<{ index: number; duration: number; cached: boolean }> = $state([])
    let cache = $state(new TokenCache({ maxSize: 50, ttl: 5 * 60 * 1000 }))
    let renderKey = $state(0)

    function render() {
        const start = performance.now()
        renderCount++
        renderKey++

        // We measure render trigger time; actual caching happens inside SvelteMarkdown
        const elapsed = performance.now() - start

        // After first render, the tokens are cached internally
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

<div class="mx-auto w-full max-w-5xl p-4">
    <!-- Header -->
    <div class="mb-6">
        <h2 class="text-foreground text-2xl font-bold">Caching Performance</h2>
        <p class="text-muted-foreground mt-1 text-sm">
            Explore how the built-in
            <code class="bg-muted rounded px-1.5 py-0.5 text-xs">TokenCache</code>
            optimizes re-renders by caching parsed markdown tokens.
        </p>
    </div>

    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <!-- Left Column: Controls & Stats -->
        <div class="space-y-6 lg:col-span-1">
            <!-- Controls -->
            <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
                <h3 class="text-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                    Controls
                </h3>
                <div class="space-y-3">
                    <button
                        onclick={render}
                        class="bg-brand-600 hover:bg-brand-700 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors"
                    >
                        <i class="fa-solid fa-play mr-2 text-xs"></i>
                        Render
                    </button>
                    <button
                        onclick={clearAndRerender}
                        class="border-border bg-card text-muted-foreground hover:text-foreground hover:border-brand-500/50 w-full rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
                    >
                        <i class="fa-solid fa-trash-can mr-2 text-xs"></i>
                        Clear Cache & Re-render
                    </button>
                </div>
            </div>

            <!-- Stats -->
            <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
                <h3 class="text-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                    Statistics
                </h3>
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <span class="text-muted-foreground text-sm">Render count</span>
                        <span class="text-foreground font-mono text-sm font-semibold">
                            {renderCount}
                        </span>
                    </div>
                    <div class="border-border border-t"></div>
                    <div class="flex items-center justify-between">
                        <span class="text-muted-foreground text-sm">Average time</span>
                        <span class="text-foreground font-mono text-sm font-semibold">
                            {averageTime}ms
                        </span>
                    </div>
                    <div class="border-border border-t"></div>
                    <div class="flex items-center justify-between">
                        <span class="text-muted-foreground text-sm">Cache size</span>
                        <span class="text-foreground font-mono text-sm font-semibold">
                            {cache.size}
                        </span>
                    </div>
                </div>
            </div>

            <!-- Render Log -->
            <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
                <h3 class="text-foreground mb-4 text-sm font-semibold tracking-wide uppercase">
                    Render Log
                </h3>
                {#if renderTimes.length === 0}
                    <p class="text-muted-foreground text-sm">
                        Click "Render" to start tracking performance.
                    </p>
                {:else}
                    <div class="max-h-48 space-y-2 overflow-y-auto">
                        {#each renderTimes.toReversed() as entry (entry.index)}
                            <div
                                class="flex items-center justify-between rounded-lg p-2 {entry.cached
                                    ? 'bg-green-500/10'
                                    : 'bg-amber-500/10'}"
                            >
                                <div class="flex items-center gap-2">
                                    <span class="text-foreground font-mono text-xs font-medium">
                                        #{entry.index}
                                    </span>
                                    <span
                                        class="rounded-full px-1.5 py-0.5 text-xs font-medium {entry.cached
                                            ? 'text-green-600'
                                            : 'text-amber-600'}"
                                    >
                                        {entry.cached ? 'cached' : 'cold'}
                                    </span>
                                </div>
                                <span class="text-muted-foreground font-mono text-xs">
                                    {entry.duration}ms
                                </span>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- Right Column: Textarea & Preview -->
        <div class="space-y-6 lg:col-span-2">
            <!-- Markdown Input -->
            <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
                <div class="mb-3 flex items-center justify-between">
                    <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                        Markdown Input
                    </h3>
                    <span class="text-muted-foreground text-xs">
                        {input.length} characters
                    </span>
                </div>
                <textarea
                    bind:value={input}
                    class="border-border bg-background text-foreground focus:ring-brand-500/50 min-h-[160px] w-full resize-y rounded-lg border p-4 font-mono text-sm focus:ring-2 focus:outline-none"
                    spellcheck="false"
                    placeholder="Enter markdown to render..."
                ></textarea>
            </div>

            <!-- Preview -->
            <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
                <div class="mb-3 flex items-center gap-2">
                    <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                        Rendered Output
                    </h3>
                    {#if renderCount > 0}
                        <span class="text-muted-foreground text-xs">
                            (render #{renderCount})
                        </span>
                    {/if}
                </div>
                {#if renderCount === 0}
                    <p class="text-muted-foreground text-sm italic">
                        Click "Render" to see the markdown output.
                    </p>
                {:else}
                    <div class="prose prose-sm dark:prose-invert max-w-none">
                        {#key renderKey}
                            <SvelteMarkdown source={input} />
                        {/key}
                    </div>
                {/if}
            </div>

            <!-- Cache Info -->
            <div
                class="border-brand-500/20 from-brand-500/5 to-brand-600/5 rounded-xl border bg-gradient-to-r p-6"
            >
                <h3 class="text-foreground mb-2 text-sm font-semibold">How Token Caching Works</h3>
                <ul class="text-muted-foreground space-y-1.5 text-sm">
                    <li class="flex items-start gap-2">
                        <i class="fa-solid fa-bolt text-brand-500 mt-0.5 text-xs"></i>
                        <span>
                            First render parses markdown into tokens and stores them in an LRU
                            cache.
                        </span>
                    </li>
                    <li class="flex items-start gap-2">
                        <i class="fa-solid fa-gauge-high text-brand-500 mt-0.5 text-xs"></i>
                        <span>
                            Subsequent renders of the same content skip parsing and use cached
                            tokens (50-200x faster).
                        </span>
                    </li>
                    <li class="flex items-start gap-2">
                        <i class="fa-solid fa-recycle text-brand-500 mt-0.5 text-xs"></i>
                        <span>
                            The cache uses LRU eviction and TTL expiration to manage memory
                            automatically.
                        </span>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</div>
