<!--
SPIKE demo route (plan 004) — human-eyes verification of the Shiki
syntax-highlighting renderer extension.

Open at /test/shiki-spike. Renders, with loud labels:
  - registered languages (JavaScript, TypeScript, JSON) highlighted,
  - an unregistered language falling back to escaped plain text,
  - an adversarial (injection-crafted) fenced-code info string,
  - a live streaming demo of a code-heavy document,
plus an on-page indicator that the synchronous highlighter engaged and NO
async-extension console warning fired (which would mean streaming was disabled).

This route is intentionally NOT part of the shipped package — it lives under
src/routes for local inspection only.
-->
<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import {
        createShikiHighlighter,
        ShikiCode,
        setShikiHighlighter,
        type ShikiHighlighter
    } from '$lib/extensions/shiki/index.js'
    import type { StreamingChunk } from '$lib/types.js'
    import js from 'shiki/langs/javascript.mjs'
    import json from 'shiki/langs/json.mjs'
    import ts from 'shiki/langs/typescript.mjs'
    import githubDark from 'shiki/themes/github-dark.mjs'

    // --- Sync highlighter setup (no WASM, no top-level await) --------------
    const setupStart = typeof performance !== 'undefined' ? performance.now() : 0
    const highlighter: ShikiHighlighter = createShikiHighlighter({
        langs: [js, ts, json],
        themes: [githubDark]
    })
    const setupMs =
        typeof performance !== 'undefined' ? (performance.now() - setupStart).toFixed(1) : 'n/a'
    // Register the module singleton so ShikiCode resolves it everywhere.
    setShikiHighlighter(highlighter)

    // --- Async-extension warning watchdog ----------------------------------
    // A synchronous renderer must NOT trip SvelteMarkdown's async-extension
    // guard. Capture any such warning so we can show a red/green indicator.
    let asyncWarningSeen = $state(false)
    let warningsCaptured = $state<string[]>([])
    if (typeof window !== 'undefined') {
        const originalWarn = console.warn
        console.warn = (...args: unknown[]) => {
            const msg = args.map(String).join(' ')
            warningsCaptured = [...warningsCaptured, msg]
            if (msg.includes('async extension')) asyncWarningSeen = true
            originalWarn(...args)
        }
    }

    // --- Per-block timing for a representative block -----------------------
    const timedBlock = Array.from(
        { length: 30 },
        (_, i) => `const value${i} = compute(a, b) + transform(items.map((x) => x.id))`
    ).join('\n')
    let perBlockMs = $state('measuring…')
    if (typeof window !== 'undefined') {
        // warm + time
        for (let i = 0; i < 3; i++) highlighter.highlight(timedBlock, 'javascript')
        const s = performance.now()
        const N = 20
        for (let i = 0; i < N; i++) highlighter.highlight(timedBlock, 'javascript')
        perBlockMs = ((performance.now() - s) / N).toFixed(1)
    }

    // --- Static highlighted cases ------------------------------------------
    const JS_SOURCE = `\`\`\`javascript
function greet(name) {
    const message = \`Hello, \${name}!\`
    return message.toUpperCase()
}
\`\`\``

    const TS_SOURCE = `\`\`\`typescript
interface User {
    id: number
    name: string
}
const admin: User = { id: 1, name: 'root' }
\`\`\``

    const JSON_SOURCE = `\`\`\`json
{ "streaming": true, "highlighter": "shiki", "async": false }
\`\`\``

    const UNREGISTERED_SOURCE = `\`\`\`rust
fn main() { let x = a < b && c > d; println!("{}", x); }
\`\`\``

    // Adversarial fenced-code info string (untrusted LLM/agent input).
    const ADVERSARIAL_LANG = '"><img src=x onerror=alert(1)>'
    const ADVERSARIAL_CODE = 'const totallyFine = 1'

    // --- Streaming demo ----------------------------------------------------
    interface Handle {
        writeChunk: (_chunk: StreamingChunk) => void
        resetStream: (_next?: string) => void
    }
    let streamHandle = $state<Handle | undefined>()

    const STREAM_DOC = `# Streaming a code-heavy document

Prose arrives first, then a fenced block streams in token by token.

\`\`\`typescript
export async function loadUser(id: number): Promise<User> {
    const res = await fetch(\`/api/users/\${id}\`)
    if (!res.ok) throw new Error('not found')
    return (await res.json()) as User
}
\`\`\`

More prose appended **after** the code block — the completed block above
must not re-highlight as these words stream in.`

    let streaming = $state(false)
    const startStream = async () => {
        if (!streamHandle) return
        streaming = true
        streamHandle.resetStream()
        const chunks = STREAM_DOC.match(/\S+\s*/g) ?? []
        for (const chunk of chunks) {
            streamHandle.writeChunk(chunk)
            await new Promise((r) => setTimeout(r, 40))
        }
        streaming = false
    }
</script>

<div class="page" data-testid="shiki-spike">
    <h1>Shiki syntax-highlighting spike</h1>

    <section class="status">
        <div class="chip {asyncWarningSeen ? 'bad' : 'good'}" data-testid="async-indicator">
            {asyncWarningSeen
                ? '✗ async-extension warning fired — streaming DISABLED'
                : '✓ Sync highlighter engaged — no async-extension warning (streaming stays ON)'}
        </div>
        <ul class="metrics">
            <li>Highlighter setup (one-time, sync): <strong>{setupMs} ms</strong></li>
            <li>Per-block highlight (~30 lines JS): <strong>{perBlockMs} ms</strong></li>
            <li>Console warnings captured: <strong>{warningsCaptured.length}</strong></li>
        </ul>
    </section>

    <section>
        <h2 class="label">Case 1 — JavaScript (registered)</h2>
        <div class="demo">
            <SvelteMarkdown source={JS_SOURCE} renderers={{ code: ShikiCode }} />
        </div>
    </section>

    <section>
        <h2 class="label">Case 2 — TypeScript (registered)</h2>
        <div class="demo">
            <SvelteMarkdown source={TS_SOURCE} renderers={{ code: ShikiCode }} />
        </div>
    </section>

    <section>
        <h2 class="label">Case 3 — JSON (registered)</h2>
        <div class="demo">
            <SvelteMarkdown source={JSON_SOURCE} renderers={{ code: ShikiCode }} />
        </div>
    </section>

    <section>
        <h2 class="label">Case 4 — Unregistered language (rust) → escaped fallback</h2>
        <p class="note">Should render as plain escaped text (no colors, no crash).</p>
        <div class="demo">
            <SvelteMarkdown source={UNREGISTERED_SOURCE} renderers={{ code: ShikiCode }} />
        </div>
    </section>

    <section>
        <h2 class="label">Case 5 — Adversarial lang (injection attempt)</h2>
        <p class="note">
            Info string: <code>{ADVERSARIAL_LANG}</code> — must NOT produce an
            <code>&lt;img&gt;</code> or fire <code>onerror</code>. Rendered via ShikiCode directly
            with the crafted lang.
        </p>
        <div class="demo" data-testid="adversarial-demo">
            <ShikiCode lang={ADVERSARIAL_LANG} text={ADVERSARIAL_CODE} {highlighter} />
        </div>
        <p class="note">Escaped HTML the sink received:</p>
        <pre class="raw">{highlighter.highlight(ADVERSARIAL_CODE, ADVERSARIAL_LANG)}</pre>
    </section>

    <section>
        <h2 class="label">Case 6 — Live streaming demo (code-heavy)</h2>
        <button onclick={startStream} disabled={streaming}>
            {streaming ? 'Streaming…' : 'Start streaming'}
        </button>
        <div class="demo" data-testid="stream-demo">
            <SvelteMarkdown
                bind:this={streamHandle}
                source=""
                streaming
                renderers={{ code: ShikiCode }}
            />
        </div>
    </section>
</div>

<style>
    .page {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1rem;
        font-family:
            system-ui,
            -apple-system,
            sans-serif;
    }
    h1 {
        font-size: 1.8rem;
    }
    .label {
        font-size: 1.15rem;
        margin-top: 2rem;
        padding: 0.4rem 0.6rem;
        background: #1e293b;
        color: #fff;
        border-radius: 6px;
    }
    .note {
        color: #475569;
        font-size: 0.9rem;
    }
    .demo {
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        padding: 0.75rem;
        margin: 0.5rem 0;
        overflow-x: auto;
    }
    .status {
        margin: 1rem 0 2rem;
    }
    .chip {
        display: inline-block;
        padding: 0.6rem 1rem;
        border-radius: 8px;
        font-weight: 600;
        color: #fff;
    }
    .chip.good {
        background: #16a34a;
    }
    .chip.bad {
        background: #dc2626;
    }
    .metrics {
        margin-top: 0.75rem;
        line-height: 1.7;
    }
    .raw {
        background: #f1f5f9;
        padding: 0.5rem;
        border-radius: 6px;
        font-size: 0.8rem;
        white-space: pre-wrap;
        word-break: break-all;
    }
    button {
        padding: 0.5rem 1rem;
        border-radius: 6px;
        border: 1px solid #334155;
        background: #334155;
        color: #fff;
        cursor: pointer;
    }
    button:disabled {
        opacity: 0.6;
        cursor: default;
    }
</style>
