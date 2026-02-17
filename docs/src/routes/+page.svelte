<script lang="ts">
    import Header from '$lib/components/general/Header.svelte'
    import Footer from '$lib/components/general/Footer.svelte'
    import { type BreadcrumbContext } from '$lib/components/contexts/Breadcrumb/type'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    let headingContainer: HTMLDivElement | null = $state(null)
    const breadcrumbContext = $state<BreadcrumbContext | undefined>(getBreadcrumbContext())

    $effect(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = []
        }
    })

    function springTap(node: HTMLElement, options: { pressedScale?: number } = {}) {
        const pressedScale = options.pressedScale ?? 0.96
        let downAnim: Animation | null = null
        let upAnim: Animation | null = null

        const press = () => {
            upAnim?.cancel()
            downAnim?.cancel()
            downAnim = node.animate(
                [{ transform: 'scale(1)' }, { transform: `scale(${pressedScale})` }],
                {
                    duration: 120,
                    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    fill: 'forwards'
                }
            )
        }

        const release = () => {
            downAnim?.cancel()
            upAnim?.cancel()
            upAnim = node.animate(
                [
                    { transform: `scale(${pressedScale})` },
                    { transform: 'scale(1.03)' },
                    { transform: 'scale(1)' }
                ],
                {
                    duration: 220,
                    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
                    fill: 'forwards'
                }
            )
        }

        const onPointerDown = () => press()
        const onPointerUp = () => release()
        const onPointerLeave = () => release()
        const onBlur = () => release()

        node.addEventListener('pointerdown', onPointerDown)
        node.addEventListener('pointerup', onPointerUp)
        node.addEventListener('pointerleave', onPointerLeave)
        node.addEventListener('blur', onBlur)

        node.style.touchAction = 'manipulation'

        return {
            destroy() {
                node.removeEventListener('pointerdown', onPointerDown)
                node.removeEventListener('pointerup', onPointerUp)
                node.removeEventListener('pointerleave', onPointerLeave)
                node.removeEventListener('blur', onBlur)
                downAnim?.cancel()
                upAnim?.cancel()
            }
        }
    }

    const features = [
        {
            title: 'Full Markdown Support',
            description:
                'GitHub Flavored Markdown with 24 built-in renderers for headings, tables, code blocks, lists, and more.',
            icon: 'fa-solid fa-file-lines'
        },
        {
            title: 'HTML Tag Rendering',
            description:
                '69+ HTML tags supported with allow/deny controls to filter exactly which tags render.',
            icon: 'fa-brands fa-html5'
        },
        {
            title: 'Custom Renderers',
            description:
                'Override any renderer with your own Svelte components for full control over markdown output.',
            icon: 'fa-solid fa-paintbrush'
        },
        {
            title: 'Token Caching',
            description:
                'Built-in LRU cache delivers 50-200x faster re-renders for previously parsed content.',
            icon: 'fa-solid fa-bolt'
        },
        {
            title: 'TypeScript First',
            description:
                'Full type safety with generics. All props, renderers, and options are properly typed.',
            icon: 'fa-brands fa-js'
        },
        {
            title: 'Svelte 5 Native',
            description:
                'Built for Svelte 5 with runes. Reactive, performant, and fully compatible with SvelteKit.',
            icon: 'fa-solid fa-feather'
        }
    ]

    const defaultMarkdown = `# Welcome to My Markdown Playground! \u{1F3A8}

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
    <Header />
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
                            <span
                                class="sheen-gradient from-foreground via-brand-500 to-foreground block bg-gradient-to-r bg-clip-text text-transparent"
                            >
                                Markdown
                            </span>
                        </h1>
                        <p
                            class="text-muted-foreground mt-6 text-base leading-7 text-pretty md:text-lg"
                        >
                            A powerful, customizable markdown renderer for Svelte 5. 24 renderers,
                            69+ HTML tags, token caching, and allow/deny utilities—all with full
                            TypeScript support.
                        </p>
                        <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <a
                                href="/docs/getting-started"
                                class="bg-brand-600 hover:bg-brand-700 focus-visible:ring-brand-600/30 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow transition-colors focus:outline-none focus-visible:ring-2"
                                use:springTap
                            >
                                Get Started
                                <i class="fa-solid fa-rocket ml-2 text-xs"></i>
                            </a>
                            <a
                                href="/docs/api/svelte-markdown"
                                class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 focus-visible:ring-brand-600/20 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                                use:springTap
                            >
                                API Reference
                                <i class="fa-solid fa-book ml-2 text-xs"></i>
                            </a>
                            <a
                                href="/examples/playground"
                                class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 focus-visible:ring-brand-600/20 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                                use:springTap
                            >
                                Playground
                                <i class="fa-solid fa-play ml-2 text-xs"></i>
                            </a>
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
                        </ul>
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
                                    <i class={feature.icon}></i>
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
                                class="text-muted-foreground hover:text-foreground text-xs transition-colors"
                            >
                                <i class="fa-solid fa-rotate-right mr-1"></i>
                                Reset
                            </button>
                            <a
                                href="/examples/playground"
                                class="text-brand-600 hover:text-brand-700 text-xs font-medium transition-colors"
                            >
                                Full Playground
                                <i class="fa-solid fa-arrow-right ml-1"></i>
                            </a>
                        </div>
                    </div>
                    <!-- Editor + Preview -->
                    <div class="grid grid-cols-1 lg:grid-cols-2">
                        <!-- Editor -->
                        <div class="border-border bg-card lg:border-r">
                            <div
                                class="border-border bg-muted/30 border-b px-4 py-1.5 text-xs font-medium"
                            >
                                <i class="fa-solid fa-pen text-muted-foreground mr-1.5"></i>
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
                                class="border-border bg-muted/30 border-b px-4 py-1.5 text-xs font-medium"
                            >
                                <i class="fa-solid fa-eye text-muted-foreground mr-1.5"></i>
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
