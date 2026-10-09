<script lang="ts">
    import type { CodeHighlighter } from '@humanspeak/svelte-markdown/extensions/highlight'
    import { createShikiHighlighter } from '@humanspeak/svelte-markdown/extensions/shiki'
    import { createTanstackHighlighter } from '@humanspeak/svelte-markdown/extensions/tanstack-highlight'
    import { js as tsJs } from '@tanstack/highlight/languages/js'
    import { json as tsJson } from '@tanstack/highlight/languages/json'
    import { ts as tsTs } from '@tanstack/highlight/languages/ts'
    import { createThemeCss } from '@tanstack/highlight/theme'
    import githubDarkTheme from '@tanstack/highlight/themes/github-dark'
    import githubLightTheme from '@tanstack/highlight/themes/github-light'
    import shikiJs from 'shiki/langs/javascript.mjs'
    import shikiJson from 'shiki/langs/json.mjs'
    import shikiTs from 'shiki/langs/typescript.mjs'
    import shikiGithubDark from 'shiki/themes/github-dark.mjs'
    import { AnimatePresence, MotionDiv, MotionSpan } from '@humanspeak/svelte-motion'
    import { tick } from 'svelte'
    import EnginePane from './EnginePane.svelte'

    // ── Corpus ────────────────────────────────────────────────────────────
    // A code-heavy "assistant reply" so highlighting is the dominant cost.
    const DEFAULT_RESPONSE = `# Adding retries to the fetch helper

Here's the change. The helper now retries on \`5xx\` with exponential backoff and gives up after three attempts.

\`\`\`ts
export interface RetryOptions {
    attempts?: number
    baseDelayMs?: number
    retryOn?: (response: Response) => boolean
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export async function fetchWithRetry(
    input: RequestInfo,
    init: RequestInit = {},
    { attempts = 3, baseDelayMs = 250, retryOn = (r) => r.status >= 500 }: RetryOptions = {}
): Promise<Response> {
    let lastError: unknown
    for (let attempt = 0; attempt < attempts; attempt++) {
        try {
            const response = await fetch(input, init)
            if (!retryOn(response) || attempt === attempts - 1) return response
        } catch (error) {
            lastError = error
        }
        await sleep(baseDelayMs * 2 ** attempt)
    }
    throw lastError ?? new Error('fetchWithRetry: exhausted attempts')
}
\`\`\`

## Usage

\`\`\`js
import { fetchWithRetry } from './fetch-with-retry'

const res = await fetchWithRetry('/api/search?q=svelte', {}, { attempts: 4 })
const { results } = await res.json()
console.log(results.length, 'results')
\`\`\`

## Config

\`\`\`json
{
    "retry": { "attempts": 3, "baseDelayMs": 250 },
    "timeoutMs": 8000
}
\`\`\`

Both engines highlight the same fences. **Shiki** ships TextMate grammars and emits inline colors. **TanStack Highlight** ships hand-written scanners and emits semantic classes, so the theme is just CSS.
`

    // ── Engines ───────────────────────────────────────────────────────────
    interface EngineStats {
        calls: number
        totalMs: number
        lastMs: number
        peakMs: number
    }

    const emptyStats = (): EngineStats => ({ calls: 0, totalMs: 0, lastMs: 0, peakMs: 0 })

    // `highlight` runs inside HighlightedCode's `$derived`, where Svelte 5
    // forbids writing reactive state. The wrappers therefore accumulate into
    // plain objects, and the streaming loop copies those into `$state` once
    // per chunk (see `publishStats`).
    const shikiRaw: EngineStats = emptyStats()
    const tanstackRaw: EngineStats = emptyStats()
    const shikiStats = $state<EngineStats>(emptyStats())
    const tanstackStats = $state<EngineStats>(emptyStats())

    /**
     * Wrap any `CodeHighlighter` so every highlight call is timed. The contract
     * is two synchronous methods, so instrumentation is a plain object — no
     * engine-specific hooks needed.
     */
    const timed = (inner: CodeHighlighter, stats: EngineStats): CodeHighlighter => ({
        hasLang: (lang) => inner.hasLang(lang),
        highlight(code, lang) {
            const started = performance.now()
            const html = inner.highlight(code, lang)
            const elapsed = performance.now() - started
            stats.calls += 1
            stats.totalMs += elapsed
            stats.lastMs = elapsed
            if (elapsed > stats.peakMs) stats.peakMs = elapsed
            return html
        }
    })

    const publishStats = () => {
        Object.assign(shikiStats, shikiRaw)
        Object.assign(tanstackStats, tanstackRaw)
    }

    const shiki = timed(
        createShikiHighlighter({
            langs: [shikiTs, shikiJs, shikiJson],
            themes: [shikiGithubDark]
        }),
        shikiRaw
    )

    const tanstack = timed(
        createTanstackHighlighter({ languages: [tsTs, tsJs, tsJson] }),
        tanstackRaw
    )

    // TanStack emits `th-*` classes only; colors come from CSS variables.
    // The docs site toggles dark mode with `html.dark`.
    const tanstackThemeCss = createThemeCss({
        light: githubLightTheme,
        dark: githubDarkTheme,
        darkSelector: 'html.dark'
    })

    // ── Streaming loop ────────────────────────────────────────────────────
    let input = $state(DEFAULT_RESPONSE)
    let displaySource = $state('')
    let showSource = $state(false)
    let isStreaming = $state(false)
    let tokensPerSecond = $state(40)
    let chunkMode: 'character' | 'word' = $state('word')
    let chunks: string[] = $state([])
    let chunkIndex = $state(0)
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let sessionId = 0

    let shikiPane: EnginePane | undefined = $state()
    let tanstackPane: EnginePane | undefined = $state()
    let sourceEl: HTMLPreElement | undefined = $state()

    const progress = $derived(
        chunks.length > 0 ? Math.round((chunkIndex / chunks.length) * 100) : 0
    )

    const splitIntoChunks = (text: string, mode: typeof chunkMode): string[] => {
        if (mode === 'character') return text.split('')
        const result: string[] = []
        const regex = /\S+\s*/g
        let match
        while ((match = regex.exec(text)) !== null) result.push(match[0])
        return result
    }

    const streamNext = async (runId: number) => {
        if (runId !== sessionId) return
        if (chunkIndex >= chunks.length) {
            isStreaming = false
            return
        }
        const chunk = chunks[chunkIndex]
        shikiPane?.writeChunk(chunk)
        tanstackPane?.writeChunk(chunk)
        displaySource += chunk
        chunkIndex++
        await tick()
        if (runId !== sessionId) return
        publishStats()
        if (sourceEl) sourceEl.scrollTop = sourceEl.scrollHeight
        if (isStreaming && runId === sessionId) {
            timeoutId = setTimeout(() => streamNext(runId), 1000 / tokensPerSecond)
        }
    }

    const clearOutput = () => {
        displaySource = ''
        shikiPane?.resetStream('')
        tanstackPane?.resetStream('')
    }

    const resetMetrics = () => {
        Object.assign(shikiRaw, emptyStats())
        Object.assign(tanstackRaw, emptyStats())
        publishStats()
    }

    const startStreaming = () => {
        if (isStreaming) return
        chunks = splitIntoChunks(input, chunkMode)
        chunkIndex = 0
        clearOutput()
        resetMetrics()
        sessionId++
        isStreaming = true
        streamNext(sessionId)
    }

    const stopStreaming = () => {
        isStreaming = false
        sessionId++
        if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
        }
    }

    const resetStreaming = () => {
        stopStreaming()
        clearOutput()
        chunks = []
        chunkIndex = 0
        resetMetrics()
    }

    const useDefault = () => {
        if (isStreaming) return
        input = DEFAULT_RESPONSE
        resetStreaming()
    }

    const formatMs = (ms: number): string => {
        if (ms === 0) return '0ms'
        if (ms < 0.1) return '<0.1ms'
        return `${ms.toFixed(1)}ms`
    }

    $effect(() => {
        return () => stopStreaming()
    })
</script>

<svelte:head>
    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
    {@html `<style>${tanstackThemeCss}</style>`}
</svelte:head>

<div class="he">
    <div class="he-bar">
        <span><span class="lbl">renderer</span> · <span class="v">HighlightedCode</span></span>
        <span><span class="lbl">engines</span> <span class="v">shiki · tanstack</span></span>
        <span><span class="lbl">progress</span> <span class="v">{progress}%</span></span>
        <span class="live"
            >{#if isStreaming}● LIVE{:else}○ IDLE{/if}</span
        >
    </div>

    <div class="he-pane he-source" class:collapsed={!showSource}>
        <div class="he-label">
            <span>SRC / STREAMING</span>
            <span class="he-meta">
                {input.length} chars
                <button class="he-mini" type="button" onclick={useDefault} disabled={isStreaming}>
                    ↺ default
                </button>
                <button
                    class="he-mini"
                    type="button"
                    onclick={() => (showSource = !showSource)}
                    aria-expanded={showSource}
                >
                    <MotionSpan
                        class="he-chevron"
                        aria-hidden="true"
                        animate={{ rotate: showSource ? 90 : 0 }}
                        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
                    >
                        ▸
                    </MotionSpan>
                    {showSource ? 'hide' : 'show'}
                </button>
            </span>
        </div>
        <AnimatePresence initial={false}>
            {#if showSource}
                <MotionDiv
                    key="source"
                    class="he-source-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                    {#if isStreaming || chunkIndex > 0}
                        <pre bind:this={sourceEl} class="he-src he-src-live">{displaySource}<span
                                class="cursor"></span></pre>
                    {:else}
                        <textarea
                            bind:value={input}
                            class="he-src he-src-edit"
                            spellcheck="false"
                            placeholder="Paste markdown with code fences to stream..."></textarea>
                    {/if}
                </MotionDiv>
            {/if}
        </AnimatePresence>
    </div>

    <div class="he-grid">
        <div class="he-pane out">
            <div class="he-label">
                <span>SHIKI / TEXTMATE</span>
                <span class="he-meta">inline colors</span>
            </div>
            <EnginePane bind:this={shikiPane} highlighter={shiki} />
            <div class="he-stats">
                <span><span class="lbl">calls</span> <span class="v">{shikiStats.calls}</span></span
                >
                <span
                    ><span class="lbl">total</span>
                    <span class="v">{formatMs(shikiStats.totalMs)}</span></span
                >
                <span
                    ><span class="lbl">last</span>
                    <span class="v">{formatMs(shikiStats.lastMs)}</span></span
                >
                <span
                    ><span class="lbl">peak</span>
                    <span class="v">{formatMs(shikiStats.peakMs)}</span></span
                >
            </div>
        </div>

        <div class="he-pane out">
            <div class="he-label">
                <span>TANSTACK / SCANNERS</span>
                <span class="he-meta">th-* classes</span>
            </div>
            <EnginePane bind:this={tanstackPane} highlighter={tanstack} />
            <div class="he-stats">
                <span
                    ><span class="lbl">calls</span>
                    <span class="v">{tanstackStats.calls}</span></span
                >
                <span
                    ><span class="lbl">total</span>
                    <span class="v">{formatMs(tanstackStats.totalMs)}</span></span
                >
                <span
                    ><span class="lbl">last</span>
                    <span class="v">{formatMs(tanstackStats.lastMs)}</span></span
                >
                <span
                    ><span class="lbl">peak</span>
                    <span class="v">{formatMs(tanstackStats.peakMs)}</span></span
                >
            </div>
        </div>
    </div>

    <div class="he-controls">
        <div class="he-actions">
            <button class="he-btn he-btn-primary" onclick={startStreaming} disabled={isStreaming}>
                ▶ start
            </button>
            <button class="he-btn" onclick={stopStreaming} disabled={!isStreaming}>■ stop</button>
            <button class="he-btn" onclick={resetStreaming}>↻ reset</button>
        </div>
        <div class="he-config">
            <label class="he-field">
                <span class="he-field-k">speed</span>
                <input type="range" min="5" max="120" step="5" bind:value={tokensPerSecond} />
                <span class="he-field-v">{tokensPerSecond}/s</span>
            </label>
            <div class="he-field he-field-radio">
                <span class="he-field-k">chunk</span>
                <div class="he-radio-group">
                    {#each ['word', 'character'] as m (m)}
                        <label class="he-radio">
                            <input
                                type="radio"
                                bind:group={chunkMode}
                                value={m}
                                disabled={isStreaming}
                            />
                            <span>{m}</span>
                        </label>
                    {/each}
                </div>
            </div>
        </div>
    </div>
</div>

<style>
    /* Fill the example cell so the engine panes take all spare height and
       the controls sit at the bottom instead of floating mid-frame. */
    .he {
        display: flex;
        flex-direction: column;
        height: 100%;
        min-height: 100%;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink, currentColor);
        background: var(--brut-bg);
    }
    .he-bar,
    .he-stats {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        flex-wrap: wrap;
    }
    .he-bar {
        border-bottom: 1px solid var(--brut-rule);
    }
    .he-stats {
        gap: 12px;
        border-top: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
    }
    .lbl {
        color: var(--brut-ink-3);
    }
    .v {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
    }
    .live {
        margin-left: auto;
        color: var(--brut-accent);
        letter-spacing: 0.1em;
        font-weight: 600;
    }
    /* Source strip sits above the engines so each engine gets half the width. */
    .he-source {
        border-bottom: 1px solid var(--brut-rule);
    }
    /* MotionDiv renders inside a child component, so its class needs :global. */
    .he-source :global(.he-source-body) {
        display: flex;
        flex-direction: column;
        overflow: hidden;
    }
    /* `flex: none` so the explicit height wins over the shared `flex: 1`
       basis inside the animated (auto-height) column. */
    .he-source .he-src {
        flex: none;
        height: 360px;
        max-height: 360px;
    }
    /* The chevron is a MotionSpan; svelte-motion drives its rotation. */
    :global(.he-chevron) {
        display: inline-block;
        margin-right: 2px;
    }
    .he-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        flex: 1;
        min-height: 240px;
        border-bottom: 1px solid var(--brut-rule);
    }
    @media (max-width: 760px) {
        .he-grid {
            grid-template-columns: minmax(0, 1fr);
        }
        .he-pane.out + .he-pane.out {
            border-left: 0;
            border-top: 1px solid var(--brut-rule);
        }
    }
    .he-pane {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
    }
    .he-pane.out + .he-pane.out {
        border-left: 1px solid var(--brut-rule);
    }
    .he-label {
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
    .he-meta {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        letter-spacing: 0.04em;
        text-transform: lowercase;
        font-size: 10px;
    }
    .he-mini {
        appearance: none;
        background: transparent;
        border: 0;
        color: var(--brut-ink-3);
        padding: 0;
        font: inherit;
        font-size: 10px;
        cursor: pointer;
        text-decoration: underline;
        text-decoration-color: transparent;
        text-underline-offset: 2px;
    }
    .he-mini:hover:not(:disabled) {
        color: var(--brut-accent);
        text-decoration-color: var(--brut-accent);
    }
    .he-mini:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .he-src {
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
        border: 0;
        outline: none;
        resize: none;
        white-space: pre-wrap;
        word-break: break-word;
        max-height: 520px;
    }
    .he-src-edit:focus {
        background: var(--brut-bg-2);
    }
    .cursor {
        display: inline-block;
        width: 7px;
        height: 1em;
        margin-left: 1px;
        background: var(--brut-accent);
        vertical-align: text-bottom;
        animation: blink 1s steps(2, end) infinite;
    }
    @keyframes blink {
        0%,
        50% {
            opacity: 1;
        }
        51%,
        100% {
            opacity: 0;
        }
    }
    .he-controls {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 10px 14px;
        flex-wrap: wrap;
    }
    .he-actions {
        display: flex;
        gap: 8px;
    }
    .he-btn {
        appearance: none;
        background: transparent;
        border: 1px solid var(--brut-rule);
        color: var(--brut-ink-2);
        padding: 5px 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.06em;
        cursor: pointer;
    }
    .he-btn-primary {
        border-color: var(--brut-accent);
        color: var(--brut-accent);
    }
    .he-btn:hover:not(:disabled) {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .he-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .he-config {
        display: flex;
        align-items: center;
        gap: 18px;
        flex-wrap: wrap;
    }
    .he-field {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .he-field-v {
        color: var(--brut-ink);
        font-variant-numeric: tabular-nums;
        min-width: 4ch;
    }
    .he-radio-group {
        display: inline-flex;
        gap: 10px;
    }
    .he-radio {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
    }
</style>
