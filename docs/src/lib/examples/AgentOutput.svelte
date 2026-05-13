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
    import { Play, RotateCw, Shield, ShieldCheck, ShieldOff } from '@lucide/svelte'
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

    // A simulated agent response combining legitimate rich HTML with
    // deliberate XSS attempts so visitors can see sanitization in action.
    const AGENT_RESPONSE = `## PR review: streaming sanitizer

Here is a quick review of the changes in \`Parser.svelte\` and \`sanitize.ts\`.

### Summary

The new sanitizer applies **defense-in-depth** at the Parser layer. Custom renderers and snippets cannot bypass it.

<div style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; border-left: 4px solid #3dbba0">
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

<img src="x" onerror="alert('boom')" alt="broken image"/>

<a href="vbscript:msgbox(1)" onclick="window.location='https://evil.example/'">Mixed-case ATTACK</a>

<form action="javascript:steal()" onsubmit="exfil()">
<input type="text" name="data" />
</form>

</details>

That is everything — the renderer kept the safe content and dropped the rest.`

    let streamSource = $state('')
    let isActive = $state(false)
    let chunks: string[] = $state([])
    let chunkIndex = $state(0)
    let sessionId = 0
    let timerId: ReturnType<typeof setTimeout> | null = null
    let markdown: StreamingMarkdownHandle | undefined = $state()
    let sanitizationLog: SanitizationEvent[] = $state([])
    let logContainer: HTMLDivElement | undefined = $state()
    let sourceContainer: HTMLPreElement | undefined = $state()

    // The Parser invokes these from inside a $derived. Mutating $state
    // during derived evaluation throws state_unsafe_mutation in Svelte 5,
    // so we buffer events and flush them in a microtask.
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

    // Wrap the defaults: log anything that gets blocked or rewritten,
    // then delegate to the real sanitizers. This is exactly how a
    // production app could add observability without giving up safety.
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
            if (logContainer) logContainer.scrollTop = logContainer.scrollHeight
            if (sourceContainer) sourceContainer.scrollTop = sourceContainer.scrollHeight
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
        markdown?.resetStream('')
    }

    onMount(() => {
        const t = setTimeout(start, 500)
        return () => {
            clearTimeout(t)
            sessionId++
            if (timerId) clearTimeout(timerId)
        }
    })
</script>

<div class="agent-output-demo">
    <p class="intro">
        A simulated agent streams a PR-review response. The payload mixes legitimate rich HTML (a
        styled verdict box, a findings table, a real link) with deliberate XSS attempts inside a <code
            >&lt;details&gt;</code
        >
        block (<code>javascript:</code> URLs,
        <code>onerror</code>/<code>onclick</code>/<code>onsubmit</code> handlers, a
        <code>vbscript:</code> protocol, a form posting to <code>javascript:</code>). Watch all
        three panes simultaneously: raw source → rendered HTML → audit log of what got blocked.
    </p>

    <div class="controls">
        <button class="btn btn-primary" disabled={isActive} onclick={start}>
            <Play class="size-4" />
            {isActive ? 'Streaming…' : 'Start streaming'}
        </button>
        <button class="btn btn-ghost" onclick={reset}>
            <RotateCw class="size-4" />
            Reset
        </button>
        <div class="status">
            {#if isActive}
                <span class="status-dot status-dot--live"></span>
                <span class="status-label">Streaming chunk {chunkIndex} / {chunks.length}</span>
            {:else if streamSource}
                <ShieldCheck class="size-4 text-emerald-500" />
                <span class="status-label">
                    Done — {sanitizationLog.length} sanitization event{sanitizationLog.length === 1
                        ? ''
                        : 's'}
                </span>
            {:else}
                <Shield class="text-muted-foreground size-4" />
                <span class="status-label">Idle</span>
            {/if}
        </div>
    </div>

    <div class="panes">
        <section class="pane pane--rendered">
            <header class="pane-header">
                <span>Rendered output</span>
                <span class="pane-hint">SvelteMarkdown render</span>
            </header>
            <div class="pane-body prose prose-sm dark:prose-invert max-w-none">
                <SvelteMarkdown
                    bind:this={markdown}
                    source=""
                    streaming={true}
                    {sanitizeUrl}
                    {sanitizeAttributes}
                />
                {#if !streamSource && !isActive}
                    <p class="text-muted-foreground italic">
                        Click "Start streaming" to render the simulated agent response.
                    </p>
                {/if}
            </div>
        </section>

        <section class="pane">
            <header class="pane-header">
                <span class="flex items-center gap-2">
                    <ShieldOff class="size-4" />
                    Sanitization log
                </span>
                <span class="pane-hint">wraps defaultSanitize*</span>
            </header>
            <div bind:this={logContainer} class="pane-body log-body">
                {#if sanitizationLog.length === 0}
                    <p class="log-empty">
                        Nothing blocked yet. The log fills in as malicious payloads stream in.
                    </p>
                {:else}
                    <ol class="log-list">
                        {#each sanitizationLog as event, i (i)}
                            <li class="log-entry log-entry--{event.kind}">
                                <span class="log-tag">&lt;{event.tag}&gt;</span>
                                <span class="log-kind">
                                    {event.kind === 'url' ? 'URL blocked' : 'attribute stripped'}
                                </span>
                                <code class="log-detail">{event.detail}</code>
                                {#if event.replacement}
                                    <span class="log-arrow">→</span>
                                    <code class="log-replacement">{event.replacement}</code>
                                {/if}
                            </li>
                        {/each}
                    </ol>
                {/if}
            </div>
        </section>

        <section class="pane">
            <header class="pane-header">
                <span>Source (agent stream)</span>
                <span class="pane-hint">raw text in</span>
            </header>
            <pre bind:this={sourceContainer} class="pane-body source-body">{streamSource ||
                    '// Click "Start streaming" — the agent response will arrive here word by word.'}</pre>
        </section>
    </div>

    <p class="caption">
        The "agent response" is hard-coded for this demo (see the <code>AGENT_RESPONSE</code>
        constant in the source). Sanitization wraps
        <code>defaultSanitizeUrl</code> and <code>defaultSanitizeAttributes</code> with a logger so you
        can see every blocked URL and stripped attribute as it streams in — in production you would use
        the defaults directly.
    </p>
</div>

<style>
    .agent-output-demo {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
    }

    .btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        font-weight: 500;
        transition: background-color 0.15s;
    }

    .btn-primary {
        background-color: var(--color-brand-600, #3dbba0);
        color: white;
    }

    .btn-primary:hover:not(:disabled) {
        background-color: var(--color-brand-700, #2da890);
    }

    .btn-primary:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-ghost {
        background-color: transparent;
        color: var(--color-foreground);
        border: 1px solid var(--color-border);
    }

    .btn-ghost:hover {
        background-color: var(--color-card, rgba(0, 0, 0, 0.04));
    }

    .status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: auto;
        font-size: 0.8125rem;
        color: var(--color-muted-foreground);
    }

    .status-dot {
        width: 0.5rem;
        height: 0.5rem;
        border-radius: 50%;
        background-color: var(--color-brand-500, #3dbba0);
    }

    .status-dot--live {
        animation: pulse 1s ease-in-out infinite;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
        }
        50% {
            opacity: 0.35;
        }
    }

    .intro {
        font-size: 0.875rem;
        line-height: 1.55;
        color: var(--color-foreground);
        margin: 0;
        padding: 0.875rem 1rem;
        background-color: var(--color-muted, rgba(61, 187, 160, 0.06));
        border: 1px solid var(--color-border);
        border-left: 3px solid var(--color-brand-500, #3dbba0);
        border-radius: 0.5rem;
    }

    .intro code {
        font-size: 0.8125rem;
        padding: 0.0625rem 0.3125rem;
        border-radius: 0.1875rem;
        background-color: rgba(0, 0, 0, 0.08);
    }

    .panes {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1rem;
    }

    @media (min-width: 900px) {
        .panes {
            grid-template-columns: 1fr 1fr;
        }

        .pane--rendered {
            grid-column: 1 / -1;
        }
    }

    .source-body {
        font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
        font-size: 0.75rem;
        line-height: 1.5;
        white-space: pre-wrap;
        word-break: break-word;
        margin: 0;
        background-color: var(--color-card);
        color: var(--color-foreground);
    }

    .pane {
        border: 1px solid var(--color-border);
        border-radius: 0.625rem;
        overflow: hidden;
        background-color: var(--color-card);
    }

    .pane-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem 0.875rem;
        background-color: var(--color-muted, rgba(0, 0, 0, 0.03));
        border-bottom: 1px solid var(--color-border);
        font-size: 0.8125rem;
        font-weight: 500;
    }

    .pane-hint {
        font-size: 0.75rem;
        font-weight: 400;
        color: var(--color-muted-foreground);
    }

    .pane-body {
        padding: 1rem;
        height: 28rem;
        overflow-y: auto;
    }

    .log-body {
        font-family: var(--font-mono, ui-monospace, SFMono-Regular, monospace);
        font-size: 0.75rem;
    }

    .log-empty {
        color: var(--color-muted-foreground);
        font-style: italic;
        font-family: inherit;
    }

    .log-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .log-entry {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.375rem;
        padding: 0.5rem 0.625rem;
        border-radius: 0.375rem;
        background-color: rgba(239, 68, 68, 0.08);
        border-left: 2px solid rgba(239, 68, 68, 0.6);
    }

    .log-entry--attribute {
        background-color: rgba(245, 158, 11, 0.08);
        border-left-color: rgba(245, 158, 11, 0.6);
    }

    .log-tag {
        font-weight: 600;
        color: var(--color-foreground);
    }

    .log-kind {
        font-size: 0.6875rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-muted-foreground);
    }

    .log-detail,
    .log-replacement {
        font-family: inherit;
        background-color: rgba(0, 0, 0, 0.06);
        padding: 0.0625rem 0.3125rem;
        border-radius: 0.1875rem;
        word-break: break-all;
    }

    .log-replacement {
        color: var(--color-muted-foreground);
    }

    .log-arrow {
        color: var(--color-muted-foreground);
    }

    .caption {
        font-size: 0.8125rem;
        color: var(--color-muted-foreground);
        margin: 0;
    }

    .caption code {
        font-size: 0.75rem;
        padding: 0.0625rem 0.3125rem;
        border-radius: 0.1875rem;
        background-color: rgba(0, 0, 0, 0.06);
    }
</style>
