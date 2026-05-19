<script lang="ts">
    import SvelteMarkdown, {
        defaultSanitizeAttributes,
        defaultSanitizeUrl
    } from '@humanspeak/svelte-markdown'
    import type {
        SanitizeAttributesFn,
        SanitizeUrlFn,
        StreamingChunk
    } from '@humanspeak/svelte-markdown'
    import { onMount } from 'svelte'

    interface StreamingMarkdownHandle {
        writeChunk: (chunk: StreamingChunk) => void
        resetStream: (nextSource?: string) => void
    }

    interface SanitizationEvent {
        kind: 'url' | 'attribute'
        tag: string
        detail: string
        replacement?: string
    }

    const AGENT_RESPONSE = `## PR review: streaming sanitizer

Here is a quick review of the changes in \`Parser.svelte\` and \`sanitize.ts\`.

### Summary

The new sanitizer applies **defense-in-depth** at the Parser layer. Custom renderers and snippets cannot bypass it.

<div style="background: rgba(61, 187, 160, 0.08); color: light-dark(#0f172a, #e2e8f0); padding: 16px; border-left: 4px solid #3dbba0">
<strong>Verdict:</strong> ship it
<ul>
<li>URL allowlist covers all dangerous protocols</li>
<li>Event handlers stripped before render</li>
<li>Streaming-aware — sanitizes per token, not per document</li>
</ul>
</div>

### Findings

| File | Severity | Note |
|------|----------|------|
| \`Parser.svelte\` | info | Single enforcement point in dispatch |
| \`sanitize.ts\` | info | Context-aware (per-tag policies possible) |
| \`token-cleanup.ts\` | info | htmlparser2 buffers partials cleanly |

### Try it

<a href="https://markdown.svelte.page/docs/advanced/security">Read the security docs</a> for the full picture.

<details>
<summary>Show malicious payloads (these get stripped live →)</summary>

Look at the sanitization log on the right as these render:

<a href="javascript:alert('XSS')">Click for surprise</a>

<img src="https://placehold.co/80x40/3dbba0/0f172a?text=sample" onerror="alert('boom')" alt="sample image"/>

<a href="vbscript:msgbox(1)" onclick="window.location='https://evil.example/'">Mixed-case ATTACK</a>

<form action="javascript:steal()" onsubmit="exfil()">
<input type="text" name="data" />
</form>

</details>

That is everything — the renderer kept the safe content and dropped the rest.`

    let isActive = $state(false)
    let chunks: string[] = $state([])
    let chunkIndex = $state(0)
    let sessionId = 0
    let timerId: ReturnType<typeof setTimeout> | null = null
    let markdown: StreamingMarkdownHandle | undefined = $state()
    let streamSource = $state('')
    let sanitizationLog: SanitizationEvent[] = $state([])
    let logEl: HTMLDivElement | undefined = $state()
    let srcEl: HTMLPreElement | undefined = $state()
    let outEl: HTMLDivElement | undefined = $state()

    // Buffer events: the Parser invokes sanitize* inside a $derived,
    // and mutating $state during derived evaluation throws in Svelte 5.
    const pendingEvents: SanitizationEvent[] = []
    let flushScheduled = false

    const scheduleFlush = () => {
        if (flushScheduled) return
        flushScheduled = true
        queueMicrotask(() => {
            flushScheduled = false
            if (pendingEvents.length === 0) return
            sanitizationLog = [...sanitizationLog, ...pendingEvents]
            pendingEvents.length = 0
        })
    }

    const sanitizeUrl: SanitizeUrlFn = (url, context) => {
        const result = defaultSanitizeUrl(url, context)
        if (result !== url) {
            pendingEvents.push({
                kind: 'url',
                tag: context.tag,
                detail: url,
                replacement: result || '(stripped)'
            })
            scheduleFlush()
        }
        return result
    }

    const sanitizeAttributes: SanitizeAttributesFn = (attributes, context, urlSanitizer) => {
        const result = defaultSanitizeAttributes(attributes, context, urlSanitizer)
        const blocked: string[] = []
        for (const key of Object.keys(attributes)) {
            if (!(key in result) && (key.toLowerCase().startsWith('on') || key === 'srcdoc')) {
                blocked.push(`${key}="${attributes[key]}"`)
            }
        }
        if (blocked.length > 0) {
            pendingEvents.push({
                kind: 'attribute',
                tag: context.tag,
                detail: blocked.join(' ')
            })
            scheduleFlush()
        }
        return result
    }

    const start = () => {
        if (isActive) return
        chunks = AGENT_RESPONSE.match(/\S+\s*/g) ?? []
        chunkIndex = 0
        streamSource = ''
        sanitizationLog = []
        pendingEvents.length = 0
        markdown?.resetStream('')
        sessionId++
        isActive = true
        next(sessionId)
    }

    const next = (sid: number) => {
        if (sid !== sessionId || chunkIndex >= chunks.length) {
            isActive = false
            return
        }
        const chunk = chunks[chunkIndex]
        streamSource += chunk
        markdown?.writeChunk(chunk)
        chunkIndex++
        requestAnimationFrame(() => {
            if (logEl) logEl.scrollTop = logEl.scrollHeight
            if (srcEl) srcEl.scrollTop = srcEl.scrollHeight
            if (outEl) outEl.scrollTop = outEl.scrollHeight
        })
        if (sid === sessionId) {
            timerId = setTimeout(() => next(sid), 25)
        }
    }

    const reset = () => {
        sessionId++
        isActive = false
        if (timerId) {
            clearTimeout(timerId)
            timerId = null
        }
        streamSource = ''
        sanitizationLog = []
        pendingEvents.length = 0
        chunkIndex = 0
        markdown?.resetStream('')
    }

    const restart = () => {
        reset()
        start()
    }

    onMount(() => {
        timerId = setTimeout(start, 500)
        return () => {
            sessionId++
            if (timerId) clearTimeout(timerId)
        }
    })
</script>

<div class="ag">
    <!-- ── Brut bar ─────────────────────────────────────────────── -->
    <div class="ag-bar">
        <span><span class="lbl">file</span> · <span class="v">agent-output.svelte</span></span>
        <span>
            <span class="lbl">chunks</span>
            <span class="v">{chunkIndex}/{chunks.length || '—'}</span>
        </span>
        <span>
            <span class="lbl">events</span>
            <span class="v">{sanitizationLog.length}</span>
        </span>
        <span class="live">
            {#if isActive}● LIVE{:else if streamSource}✓ DONE{:else}○ IDLE{/if}
        </span>
        <button class="ctrl" type="button" onclick={restart}>↻ restart</button>
    </div>

    <!-- ── Source + Rendered (two-pane top row) ─────────────────── -->
    <div class="ag-grid">
        <div class="ag-pane">
            <div class="ag-label">
                <span>SRC / AGENT STREAM</span>
                <span class="ag-meta">raw text in</span>
            </div>
            <pre bind:this={srcEl} class="ag-src">{streamSource ||
                    '// agent response will arrive here word by word.'}</pre>
        </div>
        <div class="ag-pane out">
            <div class="ag-label">
                <span>OUT / RENDERED</span>
                <span class="ag-meta">sanitized live</span>
            </div>
            <div bind:this={outEl} class="ag-out prose prose-sm dark:prose-invert max-w-none">
                <SvelteMarkdown
                    bind:this={markdown}
                    source=""
                    streaming={true}
                    {sanitizeUrl}
                    {sanitizeAttributes}
                />
                {#if !streamSource && !isActive}
                    <p class="ag-empty">click "start" to render the simulated agent response.</p>
                {/if}
            </div>
        </div>
    </div>

    <!-- ── Sanitization log (full-width) ────────────────────────── -->
    <div class="ag-log-pane">
        <div class="ag-label ag-label-log">
            <span>BLOCKED / SANITIZATION LOG</span>
            <span class="ag-meta">
                wraps defaultSanitizeUrl &amp; defaultSanitizeAttributes
                <span class="ag-keys">
                    <span class="key key-url">URL</span>
                    <span class="key key-attr">ATTR</span>
                </span>
            </span>
        </div>
        <div bind:this={logEl} class="ag-log">
            {#if sanitizationLog.length === 0}
                <p class="ag-log-empty">
                    nothing blocked yet — the log fills in as malicious payloads stream in.
                </p>
            {:else}
                <ol class="ag-log-list">
                    {#each sanitizationLog as event, i (i)}
                        <li class="ag-log-entry ag-log-{event.kind}">
                            <span class="ag-log-tag">&lt;{event.tag}&gt;</span>
                            <span class="ag-log-kind">
                                {event.kind === 'url' ? 'url blocked' : 'attribute stripped'}
                            </span>
                            <code class="ag-log-detail">{event.detail}</code>
                            {#if event.replacement}
                                <span class="ag-log-arrow">→</span>
                                <code class="ag-log-replacement">{event.replacement}</code>
                            {/if}
                        </li>
                    {/each}
                </ol>
            {/if}
        </div>
    </div>

    <!-- ── Controls ─────────────────────────────────────────────── -->
    <div class="ag-controls">
        <button class="ag-btn ag-btn-primary" onclick={start} disabled={isActive}>▶ start</button>
        <button class="ag-btn" onclick={reset}>↻ reset</button>
    </div>
</div>

<style>
    .ag {
        display: flex;
        flex-direction: column;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink, currentColor);
        background: var(--brut-bg);
    }

    /* ── Brut bar ──────────────────────────────────────────────── */
    .ag-bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        flex-wrap: wrap;
    }
    .ag-bar .lbl {
        color: var(--brut-ink-3);
    }
    .ag-bar .v {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
    }
    .ag-bar .live {
        margin-left: auto;
        color: var(--brut-accent);
        letter-spacing: 0.1em;
        font-weight: 600;
    }
    .ag-bar .ctrl {
        appearance: none;
        background: transparent;
        border: 1px solid var(--brut-rule);
        color: var(--brut-ink-2);
        padding: 3px 8px;
        font: inherit;
        font-size: 10.5px;
        letter-spacing: 0.06em;
        cursor: pointer;
        transition:
            color 0.15s,
            border-color 0.15s;
    }
    .ag-bar .ctrl:hover {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    /* ── Top grid (SRC / OUT) ──────────────────────────────────── */
    .ag-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        min-height: 340px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .ag-pane {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
    }
    .ag-pane.out {
        border-left: 1px solid var(--brut-rule);
    }

    .ag-label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 0 14px;
        min-height: 32px;
        background: var(--brut-bg-2);
        border-bottom: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .ag-meta {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        letter-spacing: 0.04em;
        text-transform: lowercase;
        font-size: 10px;
        color: var(--brut-ink-3);
    }
    .ag-keys {
        display: inline-flex;
        gap: 6px;
    }
    .key {
        padding: 1px 5px;
        border: 1px solid var(--brut-rule);
        font-size: 9px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }
    .key-url {
        color: #d9534f;
        border-color: rgba(217, 83, 79, 0.5);
    }
    .key-attr {
        color: #d97706;
        border-color: rgba(217, 119, 6, 0.5);
    }
    :global(html.dark) .key-url {
        color: #f87171;
        border-color: rgba(248, 113, 113, 0.55);
    }
    :global(html.dark) .key-attr {
        color: #fbbf24;
        border-color: rgba(251, 191, 36, 0.55);
    }

    .ag-src {
        flex: 1;
        min-height: 0;
        margin: 0;
        padding: 12px 14px;
        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        line-height: 1.65;
        overflow-y: auto;
        max-height: 440px;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .ag-out {
        flex: 1;
        min-height: 0;
        padding: 12px 14px;
        overflow-y: auto;
        max-height: 440px;
        color: var(--brut-ink-2);
    }
    .ag-empty {
        margin: 0;
        font-style: italic;
        color: var(--brut-ink-3);
        font-size: 12px;
    }
    .ag-out :global(h1),
    .ag-out :global(h2),
    .ag-out :global(h3),
    .ag-out :global(h4) {
        color: var(--brut-ink);
        letter-spacing: -0.02em;
    }
    .ag-out :global(:not(pre) > code) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
    }
    .ag-out :global(pre) {
        margin: 12px 0;
        padding: 12px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        overflow-x: auto;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        line-height: 1.65;
        color: var(--brut-ink);
        border-radius: 0;
    }
    .ag-out :global(pre code) {
        background: transparent;
        border: 0;
        padding: 0;
    }
    .ag-out :global(table) {
        border-collapse: collapse;
        font-size: 12px;
    }
    .ag-out :global(th),
    .ag-out :global(td) {
        border: 1px solid var(--brut-rule);
        padding: 4px 8px;
    }
    .ag-out :global(blockquote) {
        border-left: 2px solid var(--brut-accent);
        padding-left: 12px;
        font-style: italic;
        color: var(--brut-ink-2);
    }
    .ag-out :global(details) {
        margin: 12px 0;
        padding: 8px 10px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
    }
    .ag-out :global(summary) {
        cursor: pointer;
        font-weight: 600;
        color: var(--brut-ink);
    }

    /* ── Sanitization log (full-width) ─────────────────────────── */
    .ag-log-pane {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid var(--brut-rule);
    }
    .ag-label-log {
        background: var(--brut-bg-2);
    }
    .ag-log {
        max-height: 280px;
        overflow-y: auto;
        padding: 12px 14px;
        background: var(--brut-bg);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11.5px;
    }
    .ag-log-empty {
        margin: 0;
        color: var(--brut-ink-3);
        font-style: italic;
        font-size: 11.5px;
    }
    .ag-log-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .ag-log-entry {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 6px;
        padding: 6px 10px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        border-left-width: 3px;
        border-left-color: #d9534f;
    }
    .ag-log-attribute {
        border-left-color: #d97706;
    }
    :global(html.dark) .ag-log-url {
        border-left-color: #f87171;
    }
    :global(html.dark) .ag-log-attribute {
        border-left-color: #fbbf24;
    }
    .ag-log-tag {
        font-weight: 600;
        color: var(--brut-ink);
    }
    .ag-log-kind {
        font-size: 9.5px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .ag-log-detail,
    .ag-log-replacement {
        background: var(--brut-bg);
        border: 1px solid var(--brut-rule);
        padding: 1px 5px;
        word-break: break-all;
        font-family: inherit;
        font-size: 11px;
    }
    .ag-log-replacement {
        color: var(--brut-ink-2);
    }
    .ag-log-arrow {
        color: var(--brut-ink-3);
    }

    /* ── Controls ──────────────────────────────────────────────── */
    .ag-controls {
        display: flex;
        gap: 8px;
        padding: 14px;
        flex-wrap: wrap;
    }
    .ag-btn {
        appearance: none;
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        border: 1px solid var(--brut-rule);
        padding: 7px 14px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.06em;
        text-transform: lowercase;
        cursor: pointer;
        transition:
            color 0.15s,
            border-color 0.15s,
            background 0.15s;
    }
    .ag-btn:hover:not(:disabled) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .ag-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .ag-btn-primary {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        border-color: var(--brut-accent);
        font-weight: 600;
    }
    .ag-btn-primary:hover:not(:disabled) {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
        color: var(--brut-accent-ink);
    }

    @media (max-width: 900px) {
        .ag-grid {
            grid-template-columns: 1fr;
        }
        .ag-pane.out {
            border-left: 0;
            border-top: 1px solid var(--brut-rule);
        }
    }
</style>
