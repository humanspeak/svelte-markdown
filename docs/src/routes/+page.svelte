<script lang="ts">
    import { HeaderV2, FooterV2, getBreadcrumbContext } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import SvelteMarkdown, { rendererKeys, htmlRendererKeys } from '@humanspeak/svelte-markdown'
    import { AnimatePresence, MotionButton, MotionSpan } from '@humanspeak/svelte-motion'
    import { competitors } from '$lib/compare-data'
    import { tick } from 'svelte'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'
    import type { PageData } from './$types'

    const { data }: { data: PageData } = $props()
    const packageStats = $derived(data.packageStats)

    interface StreamingMarkdownHandle {
        writeChunk: (chunk: string) => void
        resetStream: (nextSource?: string) => void
    }

    const breadcrumbContext = getBreadcrumbContext()
    if (breadcrumbContext) breadcrumbContext.breadcrumbs = []

    // ── Package stats are fetched from the npm registry at request
    // time by `+page.server.ts` (cached for ~1 hour at the edge and in
    // memory). Renderer / HTML tag counts come from the library
    // exports directly, so those stay live automatically.
    const PKG_NAME = $derived(packageStats.name)
    const PKG_VERSION = $derived(packageStats.version)
    const TARBALL_KB = $derived(
        packageStats.tarballBytes !== null
            ? Math.round(packageStats.tarballBytes / 102.4) / 10
            : null
    )
    const RENDERER_COUNT = rendererKeys.length
    const HTML_TAG_COUNT = htmlRendererKeys.length

    interface StatItem {
        k: string
        v: string
        sup?: string
        n: string
        ac?: boolean
    }
    const stats: StatItem[] = $derived([
        { k: 'renderers', v: String(RENDERER_COUNT), n: 'built-in', ac: true },
        { k: 'html tags', v: String(HTML_TAG_COUNT), n: 'allow/deny' },
        {
            k: 'per chunk',
            v: '~3',
            sup: 'ms',
            n: 'median streaming',
            ac: true
        },
        {
            k: 'tarball',
            v: TARBALL_KB !== null ? String(TARBALL_KB) : '—',
            sup: TARBALL_KB !== null ? 'kB' : undefined,
            n: 'packed (npm gz)'
        },
        { k: 'runtime deps', v: '0', n: 'zero dependencies' },
        { k: 'licence', v: 'MIT', n: 'on GitHub' }
    ])

    const features = [
        {
            title: 'Full Markdown Support',
            body: `GitHub Flavored Markdown with ${RENDERER_COUNT} built-in renderers for headings, tables, code blocks, lists, and more.`
        },
        {
            title: 'HTML Tag Rendering',
            body: `${HTML_TAG_COUNT} HTML tags supported with allow/deny controls to filter exactly which tags render.`
        },
        {
            title: 'Custom Renderers',
            body: 'Override any renderer with your own Svelte components for full control over markdown output.'
        },
        {
            title: 'Svelte 5 Snippets',
            body: 'Override renderers inline with Svelte 5 snippets — no separate component files needed.'
        },
        {
            title: 'TypeScript First',
            body: 'Full type safety with generics. All props, renderers, and options are properly typed.'
        },
        {
            title: 'AI Agent Output',
            body: 'Render streaming HTML and markdown from Claude Code, ChatGPT, and agentic workflows — with XSS defaults, sanitization-aware streaming, and low-latency updates (median ~3ms, well under the 60fps budget).'
        }
    ]

    // ── Streaming demo ───────────────────────────────────────────────
    const streamContent = `# Understanding Reactive Systems

Reactive programming is a **declarative paradigm** concerned with _data streams_ and the propagation of change.

## Core Principles

1. **Observables** — represent a stream of data over time
2. **Operators** — transform, filter, and combine streams
3. **Subscribers** — consume the final output

> "The best way to predict the future is to invent it." — Alan Kay

### A Simple Example

\`\`\`javascript
import { writable } from 'svelte/store'

const count = writable(0)
count.subscribe(value => {
    console.log(\`Count: \${value}\`)
})
\`\`\`

| Feature | Svelte | React |
|---------|--------|-------|
| Reactivity | Compile-time | Runtime |
| Bundle Size | Small | Medium |

The \`writable\` store notifies all subscribers when the value changes. This makes building **real-time UIs** straightforward.`

    let streamSource = $state('')
    let isStreamActive = $state(false)
    let streamChunks: string[] = $state([])
    let streamIndex = $state(0)
    let streamTimerId: ReturnType<typeof setTimeout> | null = null
    let streamSessionId = 0
    let streamAvgMs = $state(0)
    let streamPeakMs = $state(0)
    let streamTotalMs = 0
    let streamRenderCount = $state(0)
    let streamPreviewEl: HTMLDivElement | undefined = $state()
    let streamSourceEl: HTMLPreElement | undefined = $state()
    let streamMarkdown: StreamingMarkdownHandle | undefined = $state()

    const startStream = () => {
        if (isStreamActive) return
        streamChunks = streamContent.match(/\S+\s*/g) ?? []
        streamIndex = 0
        streamSource = ''
        streamMarkdown?.resetStream('')
        streamTotalMs = 0
        streamRenderCount = 0
        streamAvgMs = 0
        streamPeakMs = 0
        streamSessionId++
        isStreamActive = true
        streamNextChunk(streamSessionId)
    }

    const streamNextChunk = async (sid: number) => {
        if (sid !== streamSessionId || streamIndex >= streamChunks.length) {
            isStreamActive = false
            return
        }
        const t0 = performance.now()
        const chunk = streamChunks[streamIndex]
        streamSource += chunk
        streamMarkdown?.writeChunk(chunk)
        streamIndex++
        await tick()
        if (sid !== streamSessionId) return
        const elapsed = performance.now() - t0
        streamTotalMs += elapsed
        streamRenderCount++
        streamAvgMs = Math.round((streamTotalMs / streamRenderCount) * 10) / 10
        if (elapsed > streamPeakMs) streamPeakMs = Math.round(elapsed * 10) / 10
        if (streamPreviewEl) streamPreviewEl.scrollTop = streamPreviewEl.scrollHeight
        if (streamSourceEl) streamSourceEl.scrollTop = streamSourceEl.scrollHeight
        if (isStreamActive && sid === streamSessionId) {
            streamTimerId = setTimeout(() => streamNextChunk(sid), 30)
        }
    }

    const stopStream = () => {
        isStreamActive = false
        streamSessionId++
        if (streamTimerId) {
            clearTimeout(streamTimerId)
            streamTimerId = null
        }
    }

    const restartStream = () => {
        stopStream()
        streamSource = ''
        streamMarkdown?.resetStream('')
        streamAvgMs = 0
        streamPeakMs = 0
        startStream()
    }

    // Auto-start streaming demo after a short delay so it's running when
    // the user lands on the section.
    $effect(() => {
        if (typeof window === 'undefined') return
        const timer = setTimeout(startStream, 1000)
        return () => {
            clearTimeout(timer)
            stopStream()
        }
    })

    // ── Playground ───────────────────────────────────────────────────
    const defaultMarkdown = `## Welcome to Markdown 👋

Hey! This is a *fun* example of mixing **markdown** and <em>HTML</em> together.

### Things I love
1. Writing in **bold** and _italic_
2. Streaming tokens in real-time
3. Tables that just work

| Feature | Markdown | HTML |
| ------- | -------- | ---- |
| Bold    | **text** | <strong>text</strong> |
| Links   | [npm](https://www.npmjs.com/package/@humanspeak/svelte-markdown) | <a href="https://github.com/humanspeak/svelte-markdown">github</a> |

Happy coding! <span style="color: hotpink">♥</span>`

    let editorText = $state(defaultMarkdown)
    let playgroundSource = $state(defaultMarkdown)
    let debounceTimeout: number | null = null

    const onEditorInput = () => {
        if (typeof window === 'undefined') return
        if (debounceTimeout) clearTimeout(debounceTimeout)
        debounceTimeout = window.setTimeout(() => {
            playgroundSource = editorText
        }, 400)
    }

    const resetPlayground = () => {
        editorText = defaultMarkdown
        playgroundSource = defaultMarkdown
    }

    // ── Featured examples (homepage tiles → /examples/<slug>) ────────
    const featuredExamples = [
        {
            slug: 'agent-output',
            title: 'Agent Output + Live Sanitization',
            body: 'Watch a simulated agent stream mixed markdown and HTML — with a live log of every javascript: URL and on*= handler the sanitizer blocks.'
        },
        {
            slug: 'llm-streaming',
            title: 'AI Agent / LLM Streaming',
            body: 'Stream markdown and rich HTML from AI agents in real time. Adjustable speed, jitter, and chunk modes with live render performance.'
        },
        {
            slug: 'playground',
            title: 'Live Playground',
            body: 'Edit markdown in real-time and see it rendered instantly. Mix markdown with HTML tags.'
        },
        {
            slug: 'custom-renderers',
            title: 'Custom Renderers',
            body: 'Override default renderers and control which markdown elements are rendered with your own Svelte components.'
        },
        {
            slug: 'html-filtering',
            title: 'HTML Filtering',
            body: 'Interactive demo of allow/deny controls for HTML tags within markdown content.'
        },
        {
            slug: 'snippet-overrides',
            title: 'Snippet Overrides',
            body: 'Customize rendering inline with Svelte 5 snippets. No separate component files needed.'
        }
    ]

    // ── Compare matrix ───────────────────────────────────────────────
    // Pull a handful of competitors and flatten their data into the
    // matrix shape the brutalist table expects.
    const compareRows = competitors.slice(0, 9).map((c) => {
        const featureMap = new Map(c.features.map((f) => [f.name, f]))
        const find = (name: string) => featureMap.get(name)?.them
        return {
            slug: c.slug,
            name: c.name,
            type: c.type,
            streaming: find('Streaming HTML Output') ?? find('LLM Streaming') ?? false,
            svelte5: find('Svelte 5 Compatibility') ?? find('Svelte 5 Support') ?? '—',
            customRenderers: find('Custom Renderers') ?? '—',
            allowDeny: find('HTML Tag Control') ?? false
        }
    })

    const formatCell = (v: string | boolean): { text: string; cls: string } => {
        if (v === true) return { text: 'yes', cls: 'y' }
        if (v === false) return { text: 'no', cls: 'n' }
        return { text: String(v), cls: '' }
    }

    // ── Copy install command ─────────────────────────────────────────
    const installCmd = $derived(`npm i ${PKG_NAME}`)
    let copied = $state(false)
    const copyInstall = async () => {
        if (typeof navigator === 'undefined') return
        try {
            await navigator.clipboard.writeText(installCmd)
            copied = true
            setTimeout(() => (copied = false), 1500)
        } catch {
            /* clipboard blocked — fail quiet */
        }
    }
</script>

<svelte:head>
    <title>svelte-markdown · streaming markdown + HTML renderer for Svelte 5</title>
    <meta
        name="description"
        content="A streaming-aware markdown + HTML renderer for Svelte 5. 24 renderers, 84 HTML tags, allow/deny utilities, XSS-safe defaults, and a streaming mode tuned for LLM output. MIT, zero runtime deps."
    />
</svelte:head>

<div class="brut-wrap flex min-h-svh flex-col">
    <HeaderV2
        config={docsConfig}
        {favicon}
        version={PKG_VERSION}
        nav={[
            { label: 'docs', href: '/docs' },
            { label: 'api', href: '/docs/api/svelte-markdown' },
            { label: 'examples', href: '/examples' },
            { label: 'playground', href: '/examples/playground' },
            { label: 'blog', href: '/blog' }
        ]}
    />

    <main class="brut">
        <!-- ── Coordinate strip (decorative grid markers) ────────────── -->
        <div class="brut-coord" aria-hidden="true">
            {#each Array(12) as _, i (i)}
                <div>{String(i + 1).padStart(2, '0')}</div>
            {/each}
        </div>

        <!-- ── FIG-001 · MASTHEAD ─────────────────────────────────── -->
        <section class="brut-hero">
            <div class="corner tr">FIG-001 · MASTHEAD</div>
            <aside class="meta">
                <div><span class="k">pkg</span> · <span class="v">{PKG_NAME}</span></div>
                <div><span class="k">version</span> · <span class="v">{PKG_VERSION}</span></div>
                <div>
                    <span class="k">tarball</span> ·
                    <span class="v">{TARBALL_KB !== null ? `${TARBALL_KB} kB gz` : '—'}</span>
                </div>
                <div><span class="k">deps</span> · <span class="v">0</span></div>
                <div><span class="k">licence</span> · <span class="v">MIT</span></div>
                <hr />
                <div>
                    <span class="k">renderers</span> ·
                    <span class="v">{RENDERER_COUNT}</span>
                </div>
                <div>
                    <span class="k">html tags</span> ·
                    <span class="v">{HTML_TAG_COUNT}</span>
                </div>
                <div>
                    <span class="k">streaming</span> ·
                    <span class="v accent">median ~3 ms</span>
                </div>
                <hr />
                <div class="k">// scroll for full spec</div>
            </aside>
            <div class="hero-body">
                <h1>
                    <span>svelte</span><span class="slash">/</span><span>markdown</span><span
                        class="end">.</span
                    >
                </h1>
                <p class="sub">
                    A <b>powerful, customizable</b> markdown and HTML renderer for Svelte 5 — built
                    for rendering streaming output from AI agents like Claude Code and ChatGPT. {RENDERER_COUNT}
                    renderers, {HTML_TAG_COUNT} HTML tags, token caching, XSS-safe defaults, and allow/deny
                    utilities, all fully typed.
                </p>
                <div class="cta-row">
                    <a class="pri" href="/docs/getting-started">get started ↗</a>
                    <a href="/docs/api/svelte-markdown">api reference</a>
                    <a href="/examples">examples</a>
                    <a href="/examples/playground">playground</a>
                    <a href="/blog">blog</a>
                    <MotionButton
                        class="inst"
                        type="button"
                        onclick={copyInstall}
                        aria-label="Copy install command"
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ scale: 1.01 }}
                        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
                    >
                        <span class="inst-prompt">$</span>
                        <span class="inst-cmd">npm i <span class="pkg">{PKG_NAME}</span></span>
                        <span class="inst-copy {copied ? 'is-copied' : ''}">
                            <AnimatePresence initial={false}>
                                <MotionSpan
                                    key={copied ? 'copied' : 'idle'}
                                    class="inst-copy-label"
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -6 }}
                                    transition={{ duration: 0.18, ease: 'easeOut' }}
                                >
                                    {copied ? '✓ copied' : 'copy'}
                                </MotionSpan>
                            </AnimatePresence>
                        </span>
                    </MotionButton>
                </div>
            </div>
            <div class="corner bl">FIG-001</div>
            <div class="corner br">SHEET 01 / 06</div>
        </section>

        <!-- ── Stats row ───────────────────────────────────────────── -->
        <section class="brut-stats">
            {#each stats as s, i (s.k)}
                <div class="s {s.ac ? 'ac' : ''}" data-idx="/0{i + 1}">
                    <div class="k">{s.k}</div>
                    <div class="v">
                        <span class="v-num">{s.v}</span>{#if s.sup}<span class="v-unit"
                                >{s.sup}</span
                            >{/if}
                    </div>
                    <div class="note">{s.n}</div>
                </div>
            {/each}
        </section>

        <!-- ── FIG-002 · STREAMING DEMO ────────────────────────────── -->
        <section class="brut-stream">
            <div class="lede">
                <div class="k">FIG-002 / STREAMING</div>
                <h2>stream <span>AI responses</span> in real-time.</h2>
                <p>
                    Render ChatGPT, Claude, and Gemini responses as they stream in. Smart token
                    diffing keeps each update at a median ~3ms — well under the 60fps budget.
                </p>
            </div>
            <div class="panel">
                <div class="bar">
                    <span
                        ><span class="lbl">file</span> ·
                        <span class="v">llm-streaming.svelte</span></span
                    >
                    <span><span class="lbl">avg</span> <span class="v">{streamAvgMs}ms</span></span>
                    <span
                        ><span class="lbl">peak</span> <span class="v">{streamPeakMs}ms</span></span
                    >
                    <span>
                        <span class="lbl">chunks</span>
                        <span class="v">{streamRenderCount}/{streamChunks.length || '—'}</span>
                    </span>
                    <span class="live">
                        {#if isStreamActive}● LIVE{:else}○ IDLE{/if}
                    </span>
                    <button class="ctrl" type="button" onclick={restartStream}>↻ restart</button>
                </div>
                <div class="grid">
                    <div class="pane">
                        <div class="label">SRC / STREAMING</div>
                        <pre bind:this={streamSourceEl}>{streamSource}<span class="cursor"
                            ></span></pre>
                    </div>
                    <div class="pane out" bind:this={streamPreviewEl}>
                        <div class="label">OUT / RENDERED</div>
                        <SvelteMarkdown bind:this={streamMarkdown} source="" streaming={true} />
                    </div>
                </div>
                <div class="footer">
                    <div>fps · <span class="v">60</span></div>
                    <div>frames · <span class="v">{streamRenderCount}</span></div>
                    <div>cache · <span class="v">LRU 50d / 5m</span></div>
                    <div>worker · <span class="v">main thread</span></div>
                    <div>
                        status · <span class="v accent"
                            >{isStreamActive ? 'streaming' : 'idle'}</span
                        >
                    </div>
                </div>
            </div>
        </section>

        <!-- ── FIG-003 · CAPABILITIES ──────────────────────────────── -->
        <section class="brut-feat">
            <div class="lede">
                <div class="k">FIG-003 / CAPABILITIES</div>
                <h2>why <span>svelte-markdown</span>.</h2>
                <p>The most complete markdown renderer for Svelte 5 applications.</p>
            </div>
            <div class="grid">
                {#each features as f, i (f.title)}
                    <div class="cell">
                        <div class="id">
                            № {String(i + 1).padStart(2, '0')} / {String(features.length).padStart(
                                2,
                                '0'
                            )}
                        </div>
                        <div class="corner">▢</div>
                        <h3>{f.title}</h3>
                        <p>{f.body}</p>
                        <div class="marker"></div>
                    </div>
                {/each}
            </div>
        </section>

        <!-- ── FIG-004 · PLAYGROUND ────────────────────────────────── -->
        <section class="brut-play" id="playground">
            <div class="lede">
                <div class="k">FIG-004 / PLAYGROUND</div>
                <h2>live <span>playground</span>.</h2>
                <p>Edit markdown on the left, see it rendered on the right.</p>
            </div>
            <div class="panel">
                <div class="head">
                    <span class="tab on">editor.md</span>
                    <span class="grow"></span>
                    <button class="ctrl" type="button" onclick={resetPlayground}>⟲ reset</button>
                </div>
                <div class="body">
                    <div class="col">
                        <textarea
                            bind:value={editorText}
                            oninput={onEditorInput}
                            spellcheck="false"
                            aria-label="Markdown source"
                        ></textarea>
                    </div>
                    <div class="col preview">
                        <SvelteMarkdown source={playgroundSource} />
                    </div>
                </div>
            </div>
        </section>

        <!-- ── FIG-005 · COMPARISON MATRIX ─────────────────────────── -->
        <section class="brut-comp">
            <div class="k">FIG-005 / COMPARISON MATRIX</div>
            <h2>how we <span>compare</span>.</h2>
            <p class="lede-p">
                Honest, side-by-side comparisons with every major Svelte markdown library and
                editor.
            </p>
            <div class="comp-scroll">
                <table>
                    <thead>
                        <tr>
                            <th>library</th>
                            <th>category</th>
                            <th>streaming html</th>
                            <th>svelte 5</th>
                            <th>custom renderers</th>
                            <th>allow/deny html</th>
                            <th class="comp-read-th">read more</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr class="us-row">
                            <td class="us">{PKG_NAME} ●</td>
                            <td class="us">renderer</td>
                            <td class="y">yes</td>
                            <td class="y">yes</td>
                            <td class="y">yes</td>
                            <td class="y">yes</td>
                            <td class="comp-read"><span class="comp-read-self">this row</span></td>
                        </tr>
                        {#each compareRows as row (row.slug)}
                            {@const streaming = formatCell(row.streaming)}
                            {@const svelte5 = formatCell(row.svelte5)}
                            {@const custom = formatCell(row.customRenderers)}
                            {@const allow = formatCell(row.allowDeny)}
                            <tr>
                                <td>{row.name}</td>
                                <td>{row.type}</td>
                                <td class={streaming.cls}>{streaming.text}</td>
                                <td class={svelte5.cls}>{svelte5.text}</td>
                                <td class={custom.cls}>{custom.text}</td>
                                <td class={allow.cls}>{allow.text}</td>
                                <td class="comp-read">
                                    <a
                                        href="/compare/{row.slug}"
                                        class="comp-read-link"
                                        aria-label="Read full comparison with {row.name}"
                                    >
                                        read more <span aria-hidden="true">→</span>
                                    </a>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            <a class="comp-all" href="/compare">view all comparisons →</a>
        </section>

        <!-- ── FIG-006 · EXAMPLES ──────────────────────────────────── -->
        <section class="brut-ex">
            <div class="lede">
                <div class="k">FIG-006 / EXAMPLES</div>
                <h2>explore <span>interactive examples</span>.</h2>
                <p>
                    See agent streaming, custom renderers, HTML filtering, marked extensions,
                    Mermaid diagrams, and more — all with live editors.
                </p>
            </div>
            <div>
                <div class="grid">
                    {#each featuredExamples as ex, i (ex.slug)}
                        <a class="cell" href="/examples/{ex.slug}">
                            <div class="id">
                                № {String(i + 1).padStart(2, '0')} / {String(
                                    featuredExamples.length
                                ).padStart(2, '0')}
                            </div>
                            <div class="corner">↗</div>
                            <h3>{ex.title}</h3>
                            <p>{ex.body}</p>
                            <div class="marker"></div>
                        </a>
                    {/each}
                </div>
                <a class="ex-all" href="/examples">view all examples →</a>
            </div>
        </section>

        <!-- ── Big-type footer ─────────────────────────────────────── -->
        <section class="brut-foot">
            <div class="info">
                <div>SET / JETBRAINS MONO + INTER</div>
                <div>HUMANSPEAK · 2026</div>
                <div>MIT LICENCE</div>
                <div class="v">● {PKG_VERSION}</div>
            </div>
            <MotionButton
                class="big"
                type="button"
                onclick={copyInstall}
                aria-label="Copy install command"
                whileTap={{ scale: 0.985 }}
                whileHover={{ scale: 1.005 }}
                transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            >
                npm&nbsp;i&nbsp;<span>@humanspeak/</span><br />svelte-markdown
                <span class="copy-hint">
                    <AnimatePresence initial={false}>
                        <MotionSpan
                            key={copied ? 'copied' : 'idle'}
                            class="copy-hint-label"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.22, ease: 'easeOut' }}
                        >
                            {copied ? '✓ copied to clipboard' : 'click to copy'}
                        </MotionSpan>
                    </AnimatePresence>
                </span>
            </MotionButton>
            <div class="info right">
                <div>SHEET 06 / 06</div>
                <div>END OF DOCUMENT</div>
                <a class="v" href="#top">↩ TO TOP</a>
            </div>
        </section>
    </main>

    <FooterV2 version={PKG_VERSION} />
</div>

<style>
    /* ── Brutalist Mono palette + tokens ──────────────────────────── */
    .brut-wrap {
        background: var(--brut-bg);
    }
    .brut {
        --brut-bg: #f8fcfb;
        --brut-bg-2: #eef4f1;
        --brut-ink: #0a0a0a;
        --brut-ink-2: #525252;
        --brut-ink-3: #9a9a9a;
        --brut-rule: #d6dedb;
        --brut-rule-2: #bbc4c0;
        --brut-accent: #247768;
        --brut-accent-hover: #1b5a4e;
        --brut-accent-ink: #f8fcfb;
        --brut-accent-soft: rgba(36, 119, 104, 0.1);

        background: var(--brut-bg);
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        letter-spacing: 0;
    }
    :global(html.dark) .brut,
    :global(html.dark) .brut-wrap {
        --brut-bg: #06090a;
        --brut-bg-2: #0d1110;
        --brut-ink: #ededed;
        --brut-ink-2: #9a9a9a;
        --brut-ink-3: #5a5a5a;
        --brut-rule: #1c2422;
        --brut-rule-2: #2a332f;
        --brut-accent: #54dbbc;
        --brut-accent-hover: #7fe9d1;
        --brut-accent-ink: #06090a;
        --brut-accent-soft: rgba(84, 219, 188, 0.14);
    }
    :global(html.dark) .brut-wrap {
        background: var(--brut-bg);
    }
    .brut .sans {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }

    /* ── Coordinate strip ─────────────────────────────────────────── */
    .brut-coord {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-bottom: 1px solid var(--brut-rule);
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-coord div {
        padding: 6px 8px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-coord div:last-child {
        border-right: 0;
    }

    /* ── Hero ─────────────────────────────────────────────────────── */
    .brut-hero {
        padding: 80px 24px 32px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        position: relative;
    }
    .brut-hero .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
        margin: 0;
    }
    .brut-hero .meta .k {
        color: var(--brut-ink-3);
    }
    .brut-hero .meta .v {
        color: var(--brut-ink);
    }
    .brut-hero .meta .v.accent {
        color: var(--brut-accent);
    }
    .brut-hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 8px 0;
    }
    .brut-hero h1 {
        margin: 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(56px, 11vw, 152px);
        line-height: 0.88;
        font-weight: 500;
        letter-spacing: -0.06em;
        text-transform: lowercase;
    }
    .brut-hero h1 .slash {
        color: var(--brut-accent);
    }
    .brut-hero h1 .end {
        color: var(--brut-ink-3);
    }
    .brut-hero .sub {
        margin: 28px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }
    .brut-hero .sub b {
        color: var(--brut-ink);
        font-weight: 600;
    }
    .brut-hero .cta-row {
        margin-top: 28px;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        align-items: stretch;
        width: fit-content;
        max-width: 100%;
    }
    /* Each cell owns its border (so MotionButton transforms stay visible
       inside their own outline). Adjacent cells share a seam via
       `margin-left: -1px` so the row reads as one continuous strip
       without doubled hairlines. On hover, `z-index: 2` lifts the
       scaled button above the neighbouring cells so the transform is
       never clipped. */
    .brut-hero .cta-row > * {
        padding: 10px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--brut-ink);
        cursor: pointer;
        font-family: inherit;
        text-decoration: none;
        position: relative;
        z-index: 1;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row > * + * {
        margin-left: -1px;
    }
    .brut-hero .cta-row > *:hover {
        z-index: 2;
    }
    .brut-hero .cta-row .pri {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-weight: 600;
        border-color: var(--brut-accent);
    }
    .brut-hero .cta-row .pri:hover {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
    }
    /* Scope the muted hover to non-primary anchors only — without :not(.pri)
       the rule clobbered the primary CTA's accent background and left dark
       ink on a dark surface (unreadable in both themes). */
    .brut-hero .cta-row a:not(.pri):hover,
    .brut-hero .cta-row :global(.inst:hover) {
        background: var(--brut-bg-2);
        border-color: var(--brut-rule-2);
    }
    /* MotionButton renders into a plain <button> without our scoped
       Svelte hash, so the `.cta-row > *` styles don't reach it and
       Tailwind's preflight leaves it borderless. Re-state the shared
       box styles here through `:global()` so the install cell matches
       the surrounding anchors. */
    .brut-hero .cta-row :global(.inst) {
        padding: 10px 18px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-2);
        font-family: inherit;
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        position: relative;
        z-index: 1;
        margin-left: -1px;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row :global(.inst:hover) {
        z-index: 2;
    }
    .brut-hero .cta-row :global(.inst .inst-prompt) {
        color: var(--brut-ink-3);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd) {
        color: var(--brut-ink-2);
    }
    .brut-hero .cta-row :global(.inst .inst-cmd .pkg) {
        color: var(--brut-ink);
    }
    .brut-hero .cta-row :global(.inst .inst-copy) {
        margin-left: 4px;
        padding: 2px 8px;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-accent);
        border: 1px solid var(--brut-rule);
        display: inline-grid;
        align-items: center;
        justify-items: center;
        /* Width sized to hold the wider "✓ copied" label so the box does
           not resize when AnimatePresence cross-fades between states. */
        min-width: 84px;
        height: 20px;
        overflow: hidden;
        transition:
            border-color 0.2s,
            background 0.2s;
    }
    .brut-hero .cta-row :global(.inst .inst-copy.is-copied) {
        border-color: var(--brut-accent);
        background: var(--brut-accent-soft);
    }
    .brut-hero .cta-row :global(.inst .inst-copy-label) {
        grid-area: 1 / 1;
        display: inline-block;
        white-space: nowrap;
        will-change: transform, opacity;
    }
    .brut-hero .corner {
        position: absolute;
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-hero .corner.tr {
        top: 12px;
        right: 24px;
    }
    .brut-hero .corner.bl {
        bottom: 12px;
        left: 24px;
    }
    .brut-hero .corner.br {
        bottom: 12px;
        right: 24px;
    }

    /* ── Stats row ────────────────────────────────────────────────── */
    .brut-stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-stats .s {
        padding: 28px 24px;
        border-right: 1px solid var(--brut-rule);
        position: relative;
        min-height: 160px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    .brut-stats .s:last-child {
        border-right: 0;
    }
    .brut-stats .s .k {
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
    }
    .brut-stats .s .v {
        font-size: 64px;
        line-height: 1;
        font-weight: 500;
        letter-spacing: -0.04em;
        display: inline-flex;
        align-items: baseline;
        gap: 4px;
        white-space: nowrap;
    }
    .brut-stats .s .v-num {
        line-height: 1;
    }
    .brut-stats .s .v-unit {
        font-size: 22px;
        letter-spacing: 0;
        font-weight: 500;
        color: inherit;
        line-height: 1;
    }
    .brut-stats .s .note {
        font-size: 11px;
        color: var(--brut-ink-2);
    }
    .brut-stats .s.ac .v {
        color: var(--brut-accent);
    }
    .brut-stats .s::after {
        content: attr(data-idx);
        position: absolute;
        top: 12px;
        right: 14px;
        font-size: 10px;
        color: var(--brut-ink-3);
    }

    /* ── Section lede (shared by stream/feat/play) ────────────────── */
    .brut-stream .lede,
    .brut-feat .lede,
    .brut-play .lede {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-stream .lede h2,
    .brut-feat .lede h2,
    .brut-play .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-stream .lede h2 span,
    .brut-feat .lede h2 span,
    .brut-play .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-stream .lede p,
    .brut-play .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        letter-spacing: 0;
    }

    /* ── Streaming demo ───────────────────────────────────────────── */
    .brut-stream {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-stream .panel,
    .brut-play .panel {
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }
    .brut-stream .panel .bar {
        display: flex;
        align-items: center;
        gap: 18px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-2);
        background: var(--brut-bg-2);
        flex-wrap: wrap;
    }
    .brut-stream .panel .bar .lbl {
        color: var(--brut-ink-3);
    }
    .brut-stream .panel .bar .v {
        color: var(--brut-ink);
    }
    .brut-stream .panel .bar .live {
        margin-left: auto;
        color: var(--brut-accent);
    }
    .brut-stream .panel .ctrl {
        background: transparent;
        border: 1px solid var(--brut-rule);
        padding: 4px 10px;
        font-family: inherit;
        font-size: 11px;
        color: var(--brut-ink-2);
        cursor: pointer;
    }
    .brut-stream .panel .ctrl:hover {
        background: var(--brut-bg);
        color: var(--brut-ink);
    }
    .brut-stream .panel .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        height: 520px;
    }
    .brut-stream .panel .pane {
        padding: 16px 18px;
        overflow: auto;
        min-height: 0;
    }
    .brut-stream .panel .pane + .pane {
        border-left: 1px solid var(--brut-rule);
    }
    .brut-stream .panel .pane .label {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        margin-bottom: 12px;
    }
    .brut-stream .panel .pane pre {
        margin: 0;
        font-size: 12.5px;
        line-height: 1.7;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .brut-stream .panel .pane.out :global(h1),
    .brut-stream .panel .pane.out :global(h2),
    .brut-stream .panel .pane.out :global(h3) {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.02em;
        margin: 0 0 6px;
        color: var(--brut-ink);
    }
    .brut-stream .panel .pane.out :global(h1) {
        font-size: 26px;
    }
    .brut-stream .panel .pane.out :global(h2) {
        font-size: 20px;
        margin-top: 18px;
    }
    .brut-stream .panel .pane.out :global(h3) {
        font-size: 16px;
        margin-top: 16px;
    }
    .brut-stream .panel .pane.out :global(p) {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        margin: 0 0 12px;
        line-height: 1.55;
    }
    .brut-stream .panel .pane.out :global(p b),
    .brut-stream .panel .pane.out :global(strong) {
        color: var(--brut-ink);
    }
    .brut-stream .panel .pane.out :global(code) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        color: var(--brut-ink);
    }
    .brut-stream .panel .pane.out :global(pre) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 10px 12px;
        font-size: 11.5px;
        margin-bottom: 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        color: var(--brut-ink);
    }
    .brut-stream .panel .pane.out :global(pre code) {
        background: transparent;
        border: 0;
        padding: 0;
    }
    .brut-stream .panel .pane.out :global(ol),
    .brut-stream .panel .pane.out :global(ul) {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        padding-left: 22px;
        margin: 6px 0;
        line-height: 1.55;
    }
    .brut-stream .panel .pane.out :global(table) {
        border-collapse: collapse;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 12.5px;
        width: 100%;
        margin: 8px 0;
    }
    .brut-stream .panel .pane.out :global(th),
    .brut-stream .panel .pane.out :global(td) {
        border: 1px solid var(--brut-rule);
        padding: 6px 10px;
        text-align: left;
    }
    .brut-stream .panel .pane.out :global(th) {
        background: var(--brut-bg-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.12em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        font-weight: 400;
    }
    .brut-stream .panel .pane.out :global(blockquote) {
        border-left: 2px solid var(--brut-accent);
        padding-left: 12px;
        margin: 12px 0;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-style: italic;
    }
    .cursor {
        display: inline-block;
        width: 7px;
        height: 14px;
        background: var(--brut-accent);
        vertical-align: -2px;
        margin-left: 1px;
        animation: brutblink 0.9s steps(2, end) infinite;
    }
    @keyframes brutblink {
        50% {
            opacity: 0;
        }
    }
    .brut-stream .panel .footer {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        border-top: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-2);
    }
    .brut-stream .panel .footer > div {
        padding: 8px 14px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-stream .panel .footer > div:last-child {
        border-right: 0;
    }
    .brut-stream .panel .footer .v {
        color: var(--brut-ink);
    }
    .brut-stream .panel .footer .v.accent {
        color: var(--brut-accent);
    }

    /* ── Features grid ────────────────────────────────────────────── */
    .brut-feat {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-feat .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0;
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-feat .cell {
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 20px 22px;
        min-height: 200px;
        position: relative;
    }
    .brut-feat .cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .brut-feat .cell:hover::after {
        border-color: var(--brut-accent);
    }
    .brut-feat .cell .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-feat .cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 30px 0 8px;
        color: var(--brut-ink);
    }
    .brut-feat .cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        line-height: 1.55;
        margin: 0;
        max-width: 320px;
    }
    .brut-feat .cell .corner {
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 10.5px;
        color: var(--brut-ink-3);
    }
    .brut-feat .cell .marker {
        width: 14px;
        height: 14px;
        border: 1px solid var(--brut-ink-3);
        position: absolute;
        bottom: 16px;
        right: 16px;
    }
    .brut-feat .cell:nth-child(3n + 1) .marker {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    /* ── Playground ───────────────────────────────────────────────── */
    .brut-play {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        scroll-margin-top: 80px;
    }
    .brut-play .panel .head {
        display: flex;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 11px;
        color: var(--brut-ink-3);
        background: var(--brut-bg-2);
        align-items: center;
        gap: 12px;
    }
    .brut-play .panel .head .tab {
        padding: 0 12px;
        border-right: 1px solid var(--brut-rule);
        margin-right: -1px;
    }
    .brut-play .panel .head .tab.on {
        color: var(--brut-ink);
        background: var(--brut-bg);
    }
    .brut-play .panel .head .grow {
        flex: 1;
    }
    .brut-play .panel .head .ctrl {
        background: transparent;
        border: 0;
        padding: 0 8px;
        font-family: inherit;
        font-size: 11px;
        color: var(--brut-accent);
        cursor: pointer;
    }
    .brut-play .panel .body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-height: 380px;
    }
    .brut-play .panel .body .col {
        padding: 16px 18px;
    }
    .brut-play .panel .body .col + .col {
        border-left: 1px solid var(--brut-rule);
    }
    .brut-play .panel .body textarea {
        width: 100%;
        min-height: 340px;
        background: transparent;
        color: var(--brut-ink);
        border: 0;
        outline: none;
        resize: vertical;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.7;
    }
    .brut-play .panel .body .preview {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        overflow-y: auto;
        max-height: 480px;
    }
    .brut-play .panel .body .preview :global(h1),
    .brut-play .panel .body .preview :global(h2),
    .brut-play .panel .body .preview :global(h3) {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink);
        margin: 0 0 6px;
        letter-spacing: -0.02em;
    }
    .brut-play .panel .body .preview :global(h2) {
        font-size: 22px;
        margin-top: 12px;
    }
    .brut-play .panel .body .preview :global(h3) {
        font-size: 18px;
        margin-top: 12px;
    }
    .brut-play .panel .body .preview :global(p) {
        font-size: 13.5px;
        margin: 0 0 8px;
        line-height: 1.55;
    }
    .brut-play .panel .body .preview :global(strong) {
        color: var(--brut-ink);
    }
    .brut-play .panel .body .preview :global(ol),
    .brut-play .panel .body .preview :global(ul) {
        padding-left: 22px;
        font-size: 13.5px;
        margin: 6px 0;
        line-height: 1.55;
    }
    .brut-play .panel .body .preview :global(code) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        color: var(--brut-ink);
    }
    .brut-play .panel .body .preview :global(table) {
        border-collapse: collapse;
        font-size: 12.5px;
        width: 100%;
        margin: 8px 0;
    }
    .brut-play .panel .body .preview :global(th),
    .brut-play .panel .body .preview :global(td) {
        border: 1px solid var(--brut-rule);
        padding: 6px 10px;
        text-align: left;
    }
    .brut-play .panel .body .preview :global(th) {
        background: var(--brut-bg-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.12em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        font-weight: 400;
    }
    .brut-play .panel .body .preview :global(a) {
        color: var(--brut-accent);
        text-decoration: underline;
        text-decoration-color: var(--brut-rule);
    }

    /* ── Compare table ────────────────────────────────────────────── */
    .brut-comp {
        padding: 28px 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-comp .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-comp h2 {
        font-size: 28px;
        margin: 12px 0 24px;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
        color: var(--brut-ink);
    }
    .brut-comp h2 span {
        color: var(--brut-accent);
    }
    .brut-comp .comp-scroll {
        overflow-x: auto;
    }
    .brut-comp table {
        width: 100%;
        border-collapse: collapse;
        min-width: 720px;
    }
    .brut-comp table th,
    .brut-comp table td {
        text-align: left;
        padding: 12px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-size: 13px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        color: var(--brut-ink);
    }
    .brut-comp table th {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        font-weight: 400;
        text-transform: lowercase;
    }
    .brut-comp table td.us {
        color: var(--brut-accent);
    }
    .brut-comp table .y {
        color: var(--brut-accent);
    }
    .brut-comp table .n {
        color: var(--brut-ink-3);
    }
    .brut-comp table tbody tr:hover {
        background: var(--brut-bg-2);
    }
    .brut-comp table tr.us-row {
        background: var(--brut-accent-soft);
    }
    .brut-comp table tr.us-row:hover {
        background: var(--brut-accent-soft);
    }
    .brut-comp .lede-p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        margin: 0 0 24px;
        line-height: 1.55;
        max-width: 720px;
    }
    .brut-comp .comp-read-th {
        text-align: right !important;
    }
    .brut-comp .comp-read {
        text-align: right;
        white-space: nowrap;
    }
    .brut-comp .comp-read-link {
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 11.5px;
        letter-spacing: 0.04em;
        transition: opacity 0.15s;
    }
    .brut-comp .comp-read-link:hover {
        text-decoration: underline;
    }
    .brut-comp .comp-read-self {
        color: var(--brut-ink-3);
        font-size: 11.5px;
        letter-spacing: 0.04em;
    }
    .brut-comp .comp-all {
        display: inline-block;
        margin-top: 18px;
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 12px;
        letter-spacing: 0.08em;
    }
    .brut-comp .comp-all:hover {
        text-decoration: underline;
    }

    /* ── Examples grid (mirrors FIG-003 features) ─────────────────── */
    .brut-ex {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-ex .lede .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-ex .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-ex .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-ex .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        max-width: 640px;
    }
    .brut-ex .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-ex .cell {
        display: block;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 20px 22px;
        min-height: 200px;
        position: relative;
        color: var(--brut-ink);
        text-decoration: none;
    }
    .brut-ex .cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .brut-ex .cell:hover::after {
        border-color: var(--brut-accent);
    }
    .brut-ex .cell .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-ex .cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 22px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 30px 0 8px;
        color: var(--brut-ink);
    }
    .brut-ex .cell p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        line-height: 1.55;
        margin: 0;
        max-width: 320px;
    }
    .brut-ex .cell .corner {
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 14px;
        color: var(--brut-ink-3);
        transition: color 0.2s;
    }
    .brut-ex .cell:hover .corner {
        color: var(--brut-accent);
    }
    .brut-ex .cell .marker {
        width: 14px;
        height: 14px;
        border: 1px solid var(--brut-ink-3);
        position: absolute;
        bottom: 16px;
        right: 16px;
    }
    .brut-ex .cell:nth-child(3n + 1) .marker {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
    }
    .brut-ex .ex-all {
        display: inline-block;
        margin-top: 18px;
        color: var(--brut-accent);
        text-decoration: none;
        font-size: 12px;
        letter-spacing: 0.08em;
    }
    .brut-ex .ex-all:hover {
        text-decoration: underline;
    }

    /* ── Footer big-type ──────────────────────────────────────────── */
    .brut-foot {
        padding: 60px 24px 36px;
        display: grid;
        grid-template-columns: 200px 1fr 200px;
        gap: 24px;
        border-top: 1px solid var(--brut-rule);
        align-items: end;
    }
    .brut-foot :global(.big) {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(40px, 7vw, 96px);
        line-height: 0.9;
        letter-spacing: -0.06em;
        text-transform: lowercase;
        background: transparent;
        border: 0;
        color: var(--brut-ink);
        text-align: left;
        cursor: pointer;
        padding: 0;
        position: relative;
    }
    .brut-foot :global(.big span) {
        color: var(--brut-accent);
    }
    .brut-foot :global(.big .copy-hint) {
        display: inline-grid;
        align-items: center;
        justify-items: start;
        margin-top: 16px;
        height: 16px;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        overflow: hidden;
        min-width: 200px;
    }
    .brut-foot :global(.big .copy-hint-label) {
        grid-area: 1 / 1;
        display: inline-block;
        white-space: nowrap;
        will-change: transform, opacity;
    }
    .brut-foot :global(.big:hover .copy-hint) {
        color: var(--brut-accent);
    }
    .brut-foot .info {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.12em;
        line-height: 1.8;
    }
    .brut-foot .info.right {
        text-align: right;
    }
    .brut-foot .info .v,
    .brut-foot .info a.v {
        color: var(--brut-ink);
        text-decoration: none;
        display: block;
        margin-top: 12px;
    }
    .brut-foot .info a.v:hover {
        color: var(--brut-accent);
    }

    /* ── Responsive collapse ─────────────────────────────────────── */
    @media (max-width: 1024px) {
        .brut-stats {
            grid-template-columns: repeat(3, 1fr);
        }
        .brut-stats .s:nth-child(3n) {
            border-right: 0;
        }
        .brut-stats .s:nth-child(-n + 3) {
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-feat .grid,
        .brut-ex .grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .brut-stream .panel .grid,
        .brut-play .panel .body {
            grid-template-columns: 1fr;
        }
        .brut-stream .panel .grid {
            height: auto;
        }
        .brut-stream .panel .pane {
            height: 320px;
        }
        .brut-stream .panel .pane + .pane,
        .brut-play .panel .body .col + .col {
            border-left: 0;
            border-top: 1px solid var(--brut-rule);
        }
        .brut-ex {
            grid-template-columns: 1fr;
        }
    }
    @media (max-width: 720px) {
        .brut-coord {
            display: none;
        }
        .brut-hero,
        .brut-stream,
        .brut-feat,
        .brut-play,
        .brut-ex {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
        }
        .brut-hero {
            padding-top: 56px;
        }
        .brut-stats {
            grid-template-columns: repeat(2, 1fr);
        }
        .brut-stats .s {
            min-height: 130px;
            padding: 20px 16px;
        }
        .brut-stats .s .v {
            font-size: 44px;
        }
        .brut-stats .s:nth-child(2n) {
            border-right: 0;
        }
        .brut-stats .s:not(:nth-last-child(-n + 2)) {
            border-bottom: 1px solid var(--brut-rule);
        }
        .brut-feat .grid,
        .brut-ex .grid {
            grid-template-columns: 1fr;
        }
        .brut-foot {
            grid-template-columns: 1fr;
            padding: 40px 16px 28px;
        }
        .brut-foot .info.right {
            text-align: left;
        }
    }
</style>
