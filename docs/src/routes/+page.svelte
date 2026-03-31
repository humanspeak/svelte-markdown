<script lang="ts">
    import { Header, Footer, getBreadcrumbContext } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import Icon from '$lib/components/general/Icon.svelte'
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { motion } from '@humanspeak/svelte-motion'
    import {
        ArrowRight,
        Rocket,
        BookOpen,
        Play,
        Square,
        RotateCw,
        Pen,
        Eye,
        FlaskConical,
        Zap
    } from '@lucide/svelte'
    import { tick } from 'svelte'
    import { competitors } from '$lib/compare-data'
    import type { IconName } from '$lib/icons'

    interface StreamingMarkdownHandle {
        writeChunk: (chunk: string) => void
        resetStream: (nextSource?: string) => void
    }

    let headingContainer: HTMLDivElement | null = $state(null)
    const breadcrumbContext = getBreadcrumbContext()

    if (breadcrumbContext) {
        breadcrumbContext.breadcrumbs = []
    }

    const features: { title: string; description: string; icon: IconName }[] = [
        {
            title: 'Full Markdown Support',
            description:
                'GitHub Flavored Markdown with 24 built-in renderers for headings, tables, code blocks, lists, and more.',
            icon: 'file-text'
        },
        {
            title: 'HTML Tag Rendering',
            description:
                '69+ HTML tags supported with allow/deny controls to filter exactly which tags render.',
            icon: 'html5'
        },
        {
            title: 'Custom Renderers',
            description:
                'Override any renderer with your own Svelte components for full control over markdown output.',
            icon: 'paintbrush'
        },
        {
            title: 'Svelte 5 Snippets',
            description:
                'Override renderers inline with Svelte 5 snippets — no separate component files needed.',
            icon: 'scissors'
        },
        {
            title: 'TypeScript First',
            description:
                'Full type safety with generics. All props, renderers, and options are properly typed.',
            icon: 'javascript'
        },
        {
            title: 'LLM Streaming',
            description:
                'Render ChatGPT and Claude responses in real-time. Smart token diffing keeps updates under 2ms.',
            icon: 'zap'
        }
    ]

    const defaultMarkdown = `## Welcome to My Markdown Playground! \u{1F3A8}

Hey there! This is a *fun* example of mixing **Markdown** and <em>HTML</em> together.

## Things I Love:
1. Writing in <strong>bold</strong> and _italic_
2. Making lists (like this one!)
3. Using emojis \u{1F680} \u{2728} \u{1F308}

| Feature | Markdown | HTML |
|---------|:--------:|-----:|
| Bold | **text** | <strong>text</strong> |
| Italic | *text* | <em>text</em> |
| Links | [npm](https://www.npmjs.com/package/@humanspeak/svelte-markdown) | <a href="https://github.com/humanspeak/svelte-markdown">github</a> |

Here's a quote for you:
> "The best of both worlds" - <cite>Someone who loves markdown & HTML</cite>

You can even use <sup>superscript</sup> and <sub>subscript</sub> text!

---

<details>
<summary>Want to see something cool?</summary>
Here's a hidden surprise! \u{1F389}
</details>

Happy coding! <span style="color: hotpink">\u{2665}</span>`

    let editorText = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimeout: number | null = null

    const onInput = () => {
        if (typeof window === 'undefined') return
        if (debounceTimeout) clearTimeout(debounceTimeout)
        debounceTimeout = window.setTimeout(() => {
            source = editorText
        }, 500)
    }

    const resetPlayground = () => {
        editorText = defaultMarkdown
        source = defaultMarkdown
    }

    // --- Streaming demo state ---
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
    let streamSourceEl: HTMLTextAreaElement | undefined = $state()
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

    const resetStream = () => {
        stopStream()
        streamSource = ''
        streamMarkdown?.resetStream('')
        streamAvgMs = 0
        streamPeakMs = 0
    }

    // Auto-start streaming demo after a short delay
    $effect(() => {
        if (typeof window === 'undefined') return
        const timer = setTimeout(startStream, 1000)
        return () => {
            clearTimeout(timer)
            stopStream()
        }
    })

    function splitHeadingWords(root: HTMLElement) {
        const lines = root.querySelectorAll('h1 span')
        const words: HTMLElement[] = []
        lines.forEach((line) => {
            const text = line.textContent ?? ''
            line.textContent = ''
            const tokens = text.split(/(\s+)/)
            for (const t of tokens) {
                if (t.trim().length === 0) {
                    line.appendChild(document.createTextNode(t))
                } else {
                    const w = document.createElement('span')
                    w.className = 'split-word'
                    w.textContent = t
                    line.appendChild(w)
                    words.push(w)
                }
            }
        })
        return words
    }

    $effect(() => {
        if (typeof document === 'undefined') return
        if (!headingContainer) return
        headingContainer.style.visibility = 'hidden'
        document.fonts?.ready
            .then(() => {
                if (!headingContainer) return
                const words = splitHeadingWords(headingContainer)
                headingContainer.style.visibility = 'visible'
                words.forEach((el, i) => {
                    el.animate(
                        [
                            { opacity: 0, transform: 'translateY(10px)' },
                            { opacity: 1, transform: 'translateY(0)' }
                        ],
                        {
                            duration: 800,
                            easing: 'ease-out',
                            delay: i * 50,
                            fill: 'forwards'
                        }
                    )
                })
            })
            .catch(() => {
                headingContainer!.style.visibility = 'visible'
            })
    })
</script>

<div class="flex min-h-svh flex-col">
    <!-- Header with links -->
    <Header config={docsConfig} {favicon} />
    <div class="relative flex flex-1 flex-col overflow-hidden">
        <!-- Layer: subtle grid -->
        <div class="bg-grid pointer-events-none absolute inset-0 -z-20"></div>
        <!-- Layer: soft radial glow -->
        <div class="bg-glow pointer-events-none absolute inset-0 -z-10"></div>
        <!-- Layer: animated orbs via motion -->
        <div
            class="orb-a-bg pointer-events-none absolute bottom-[-80px] left-[-80px] h-[320px] w-[320px] rounded-full opacity-50 blur-[30px]"
            style="will-change: transform;"
        ></div>
        <div
            class="orb-b-bg pointer-events-none absolute top-[20%] right-[-60px] h-[260px] w-[260px] rounded-full opacity-50 blur-[30px]"
            style="will-change: transform;"
        ></div>

        <!-- Hero Section -->
        <section class="relative flex flex-1">
            <div
                class="relative mx-auto flex w-full max-w-7xl items-center justify-center px-6 py-8 md:py-12"
            >
                <div class="mx-auto max-w-4xl text-center">
                    <div bind:this={headingContainer} class="mx-auto max-w-4xl text-center">
                        <h1
                            class="text-foreground text-5xl leading-tight font-semibold text-balance md:text-7xl"
                        >
                            <span class="block">Svelte</span>
                            <span class="text-brand-500 block"> Markdown </span>
                        </h1>
                        <p
                            class="text-muted-foreground mt-6 text-base leading-7 text-pretty md:text-lg"
                        >
                            A powerful, customizable markdown renderer for Svelte 5. <br />24
                            renderers, 69+ HTML tags, token caching, and allow/deny utilities—all
                            with full TypeScript support.
                        </p>
                        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <motion.a
                                href="/docs/getting-started"
                                class="bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-600/30 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow transition-colors focus:outline-none focus-visible:ring-2"
                                whileTap={{ scale: 0.96 }}
                                whileHover={{ scale: 1.03 }}
                            >
                                Get Started
                                <Rocket class="ml-2 size-3" />
                            </motion.a>
                            <motion.a
                                href="/docs/api/svelte-markdown"
                                class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 focus-visible:ring-brand-600/20 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                                whileTap={{ scale: 0.96 }}
                                whileHover={{ scale: 1.03 }}
                            >
                                API Reference
                                <BookOpen class="ml-2 size-3" />
                            </motion.a>
                            <motion.a
                                href="/examples"
                                class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 focus-visible:ring-brand-600/20 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                                whileTap={{ scale: 0.96 }}
                                whileHover={{ scale: 1.03 }}
                            >
                                Examples
                                <FlaskConical class="ml-2 size-3" />
                            </motion.a>
                            <motion.a
                                href="/examples/playground"
                                class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 focus-visible:ring-brand-600/20 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                                whileTap={{ scale: 0.96 }}
                                whileHover={{ scale: 1.03 }}
                            >
                                Playground
                                <Play class="ml-2 size-3" />
                            </motion.a>
                        </div>
                        <ul
                            class="text-muted-foreground mt-10 flex flex-wrap justify-center gap-2 text-xs"
                        >
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                Svelte 5
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                TypeScript
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                24 Renderers
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                69+ HTML Tags
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                LLM Streaming
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </section>

        <!-- LLM Streaming Demo Section -->
        <section class="relative px-6 py-10">
            <div class="container mx-auto max-w-7xl">
                <div class="mb-8 text-center">
                    <h2
                        class="from-brand-500 to-brand-600 mb-4 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent md:text-4xl"
                    >
                        Stream AI Responses in Real-Time
                    </h2>
                    <p class="text-muted-foreground mx-auto max-w-2xl">
                        Render ChatGPT, Claude, and Gemini responses as they stream in. Smart token
                        diffing keeps each update under 2ms.
                    </p>
                </div>
                <div class="border-border overflow-hidden rounded-xl border">
                    <!-- Toolbar -->
                    <div
                        class="border-border bg-card/80 flex items-center justify-between border-b px-4 py-2"
                    >
                        <div class="flex items-center gap-3">
                            <div class="flex gap-1.5">
                                <div class="h-3 w-3 rounded-full bg-red-400/60"></div>
                                <div class="h-3 w-3 rounded-full bg-yellow-400/60"></div>
                                <div class="h-3 w-3 rounded-full bg-green-400/60"></div>
                            </div>
                            <span class="text-muted-foreground text-xs font-medium"
                                >LLM streaming demo</span
                            >
                        </div>
                        <div class="flex items-center gap-3">
                            {#if streamRenderCount > 0}
                                <div
                                    class="text-muted-foreground hidden items-center gap-3 font-mono text-xs sm:flex"
                                >
                                    <span>
                                        avg: <span class="text-brand-500 font-semibold"
                                            >{streamAvgMs}ms</span
                                        >
                                    </span>
                                    <span>
                                        peak: <span
                                            class="font-semibold {streamPeakMs > 16
                                                ? 'text-amber-500'
                                                : 'text-brand-500'}">{streamPeakMs}ms</span
                                        >
                                    </span>
                                    <span>
                                        {streamIndex}/{streamChunks.length} chunks
                                    </span>
                                </div>
                            {/if}
                            <div class="flex items-center gap-1.5">
                                <button
                                    onclick={startStream}
                                    disabled={isStreamActive}
                                    class="text-muted-foreground hover:text-foreground inline-flex items-center text-xs transition-colors disabled:opacity-40"
                                >
                                    <Play class="mr-1 size-3" />
                                    Start
                                </button>
                                <button
                                    onclick={stopStream}
                                    disabled={!isStreamActive}
                                    class="text-muted-foreground hover:text-foreground inline-flex items-center text-xs transition-colors disabled:opacity-40"
                                >
                                    <Square class="mr-1 size-3" />
                                    Stop
                                </button>
                                <button
                                    onclick={resetStream}
                                    class="text-muted-foreground hover:text-foreground inline-flex items-center text-xs transition-colors"
                                >
                                    <RotateCw class="mr-1 size-3" />
                                    Reset
                                </button>
                            </div>
                            <a
                                href="/examples/llm-streaming"
                                class="text-brand-600 hover:text-brand-700 inline-flex items-center text-xs font-medium transition-colors"
                            >
                                Full Demo
                                <ArrowRight class="ml-1 size-3" />
                            </a>
                        </div>
                    </div>
                    <!-- Source + Preview -->
                    <div class="grid grid-cols-1 lg:grid-cols-2">
                        <!-- Source -->
                        <div class="border-border bg-card lg:border-r">
                            <div
                                class="border-border bg-muted/30 flex items-center border-b px-4 py-1.5 text-xs font-medium"
                            >
                                <Zap class="text-brand-500 mr-1.5 size-3" />
                                <span class="text-muted-foreground">Streaming source</span>
                            </div>
                            <textarea
                                bind:this={streamSourceEl}
                                readonly
                                value={streamSource}
                                class="bg-card text-foreground h-[350px] w-full resize-none p-4 font-mono text-xs leading-relaxed focus:outline-none"
                                placeholder="Click Start to begin streaming..."
                            ></textarea>
                        </div>
                        <!-- Preview -->
                        <div class="bg-background">
                            <div
                                class="border-border bg-muted/30 flex items-center border-b px-4 py-1.5 text-xs font-medium"
                            >
                                <Eye class="text-muted-foreground mr-1.5 size-3" />
                                <span class="text-muted-foreground">Rendered output</span>
                                {#if isStreamActive}
                                    <span
                                        class="ml-2 inline-flex items-center gap-1 text-xs text-green-500"
                                    >
                                        <span
                                            class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"
                                        ></span>
                                        streaming
                                    </span>
                                {/if}
                            </div>
                            <div
                                bind:this={streamPreviewEl}
                                class="prose prose-sm dark:prose-invert h-[350px] max-w-none overflow-y-auto p-4"
                            >
                                <SvelteMarkdown
                                    bind:this={streamMarkdown}
                                    source=""
                                    streaming={true}
                                />
                                {#if !streamSource}
                                    <p class="text-muted-foreground italic">
                                        Click "Start" to stream an AI response...
                                    </p>
                                {/if}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Features Section -->
        <section class="relative px-6 py-10">
            <div class="container mx-auto max-w-7xl">
                <!-- Section Header -->
                <div class="mb-16 text-center">
                    <h2
                        class="from-brand-500 to-brand-600 mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
                    >
                        Why Svelte Markdown
                    </h2>
                    <p class="text-muted-foreground mx-auto max-w-2xl text-lg">
                        The most complete markdown renderer for Svelte 5 applications.
                    </p>
                </div>
                <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {#each features as feature (feature.title)}
                        <div
                            class="group border-border bg-card hover:border-brand-500/50 hover:shadow-brand-500/10 relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                        >
                            <div
                                class="from-brand-500/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            ></div>
                            <div class="relative z-10">
                                <div
                                    class="from-brand-500 to-brand-600 mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br text-white"
                                >
                                    <Icon name={feature.icon} class="size-5" />
                                </div>
                                <h3
                                    class="group-hover:text-brand-600 mb-2 text-xl font-semibold transition-colors"
                                >
                                    {feature.title}
                                </h3>
                                <p class="text-muted-foreground text-sm leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>
                            <div
                                class="from-brand-500/10 absolute top-0 right-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            ></div>
                        </div>
                    {/each}
                </div>
            </div>
        </section>

        <!-- Live Playground Section -->
        <section class="relative px-6 py-10">
            <div class="container mx-auto max-w-7xl">
                <div class="mb-8 text-center">
                    <h2 class="text-foreground mb-4 text-3xl font-bold">Live Playground</h2>
                    <p class="text-muted-foreground">
                        Edit markdown on the left, see it rendered on the right.
                    </p>
                </div>
                <div class="border-border overflow-hidden rounded-xl border">
                    <!-- Toolbar -->
                    <div
                        class="border-border bg-card/80 flex items-center justify-between border-b px-4 py-2"
                    >
                        <div class="flex items-center gap-3">
                            <div class="flex gap-1.5">
                                <div class="h-3 w-3 rounded-full bg-red-400/60"></div>
                                <div class="h-3 w-3 rounded-full bg-yellow-400/60"></div>
                                <div class="h-3 w-3 rounded-full bg-green-400/60"></div>
                            </div>
                            <span class="text-muted-foreground text-xs font-medium"
                                >svelte-markdown playground</span
                            >
                        </div>
                        <div class="flex items-center gap-2">
                            <button
                                onclick={resetPlayground}
                                class="text-muted-foreground hover:text-foreground inline-flex items-center text-xs transition-colors"
                            >
                                <RotateCw class="mr-1 size-3" />
                                Reset
                            </button>
                            <a
                                href="/examples/playground"
                                class="text-brand-600 hover:text-brand-700 inline-flex items-center text-xs font-medium transition-colors"
                            >
                                Full Playground
                                <ArrowRight class="ml-1 size-3" />
                            </a>
                        </div>
                    </div>
                    <!-- Editor + Preview -->
                    <div class="grid grid-cols-1 lg:grid-cols-2">
                        <!-- Editor -->
                        <div class="border-border bg-card lg:border-r">
                            <div
                                class="border-border bg-muted/30 flex items-center border-b px-4 py-1.5 text-xs font-medium"
                            >
                                <Pen class="text-muted-foreground mr-1.5 size-3" />
                                <span class="text-muted-foreground">Editor</span>
                            </div>
                            <textarea
                                bind:value={editorText}
                                oninput={onInput}
                                class="bg-card text-foreground h-[400px] w-full resize-none p-4 font-mono text-sm leading-relaxed focus:outline-none"
                                spellcheck="false"
                            ></textarea>
                        </div>
                        <!-- Preview -->
                        <div class="bg-background">
                            <div
                                class="border-border bg-muted/30 flex items-center border-b px-4 py-1.5 text-xs font-medium"
                            >
                                <Eye class="text-muted-foreground mr-1.5 size-3" />
                                <span class="text-muted-foreground">Preview</span>
                            </div>
                            <div
                                class="prose prose-sm dark:prose-invert h-[400px] max-w-none overflow-y-auto p-4"
                            >
                                <SvelteMarkdown {source} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Examples CTA Section -->
        <section class="relative px-6 py-10">
            <div class="container mx-auto max-w-7xl">
                <div
                    class="border-brand-500/20 from-brand-500/10 to-brand-600/10 relative overflow-hidden rounded-2xl border bg-gradient-to-r p-8 text-center md:p-12"
                >
                    <div
                        class="from-brand-500/5 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent"
                    ></div>
                    <div class="relative z-10">
                        <div
                            class="from-brand-500 to-brand-600 mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br text-white"
                        >
                            <FlaskConical class="size-5" />
                        </div>
                        <h2 class="text-foreground mb-3 text-2xl font-bold md:text-3xl">
                            Explore Interactive Examples
                        </h2>
                        <p class="text-muted-foreground mx-auto mb-6 max-w-xl text-sm md:text-base">
                            See custom renderers, HTML filtering, marked extensions, Mermaid
                            diagrams, code formatting, and more — all with live editors.
                        </p>
                        <motion.a
                            href="/examples"
                            class="from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 inline-flex items-center rounded-lg bg-gradient-to-r px-5 py-2.5 font-medium text-white transition-all duration-200"
                            whileTap={{ scale: 0.96 }}
                            whileHover={{ scale: 1.03 }}
                        >
                            Browse Examples
                            <ArrowRight class="ml-2 size-4" />
                        </motion.a>
                    </div>
                </div>
            </div>
        </section>
        <!-- Compare Section -->
        <section class="relative px-6 py-10">
            <div class="container mx-auto max-w-7xl">
                <div class="mb-8 text-center">
                    <h2
                        class="from-brand-500 to-brand-600 mb-4 bg-gradient-to-r bg-clip-text text-3xl font-bold text-transparent md:text-4xl"
                    >
                        How We Compare
                    </h2>
                    <p class="text-muted-foreground mx-auto max-w-2xl">
                        Honest, side-by-side comparisons with every major Svelte markdown library
                        and editor.
                    </p>
                </div>
                <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                    {#each competitors as comp (comp.slug)}
                        <a
                            href="/compare/{comp.slug}"
                            class="group border-border bg-card hover:border-brand-500/50 hover:shadow-brand-500/10 relative overflow-hidden rounded-lg border px-4 py-3 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                        >
                            <div
                                class="from-brand-500/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                            ></div>
                            <div class="relative z-10">
                                <p
                                    class="text-foreground group-hover:text-brand-600 text-sm font-semibold transition-colors"
                                >
                                    vs {comp.name}
                                </p>
                                <p class="text-muted-foreground mt-0.5 text-xs">
                                    {comp.type}
                                </p>
                            </div>
                        </a>
                    {/each}
                </div>
                <div class="mt-6 text-center">
                    <a
                        href="/compare"
                        class="text-brand-600 hover:text-brand-700 inline-flex items-center text-sm font-medium transition-colors"
                    >
                        View all comparisons
                        <ArrowRight class="ml-1.5 size-3.5" />
                    </a>
                </div>
            </div>
        </section>
    </div>
    <Footer />
</div>

<style>
    /* Decorative layers */
    .bg-grid {
        background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
        background-size: 24px 24px;
        background-position: 50% 0;
        mask-image: radial-gradient(ellipse at center, rgba(0, 0, 0, 1) 20%, rgba(0, 0, 0, 0) 70%);
    }
    .bg-glow {
        background:
            radial-gradient(60% 50% at 50% 0%, rgba(84, 219, 188, 0.18), transparent 60%),
            radial-gradient(40% 40% at 90% 20%, rgba(84, 219, 188, 0.12), transparent 60%),
            radial-gradient(40% 40% at 10% 15%, rgba(84, 219, 188, 0.12), transparent 60%);
        filter: blur(0.2px);
    }

    /* Orb animations to replace motion components */
    .orb-a-bg {
        animation: orbA 28s ease-in-out infinite;
    }
    .orb-b-bg {
        animation: orbB 24s ease-in-out infinite;
        animation-delay: 3s;
    }

    @keyframes orbA {
        0% {
            transform: translate(0, 0);
        }
        25% {
            transform: translate(8vw, -10vh);
        }
        50% {
            transform: translate(-4vw, 6vh);
        }
        75% {
            transform: translate(2vw, -4vh);
        }
        100% {
            transform: translate(0, 0);
        }
    }

    @keyframes orbB {
        0% {
            transform: translate(0, 0);
        }
        25% {
            transform: translate(-6vw, -8vh);
        }
        50% {
            transform: translate(3vw, 4vh);
        }
        75% {
            transform: translate(-2vw, -6vh);
        }
        100% {
            transform: translate(0, 0);
        }
    }
</style>
