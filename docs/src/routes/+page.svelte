<script lang="ts">
    import Header from '$lib/components/general/Header.svelte'
    import Footer from '$lib/components/general/Footer.svelte'
    import { type BreadcrumbContext } from '$lib/components/contexts/Breadcrumb/type'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'

    // mounted no longer needed for CSS enter
    let headingContainer: HTMLDivElement | null = $state(null)
    const breadcrumbContext = $state<BreadcrumbContext | undefined>(getBreadcrumbContext())

    $effect(() => {
        if (breadcrumbContext) {
            breadcrumbContext.breadcrumbs = []
        }
    })

    // Simple spring-like tap animation using the Web Animations API
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
            title: 'Lightning Fast',
            description:
                'In-memory storage with O(1) lookups. No network latency, no disk I/O—just pure speed.',
            icon: 'fa-solid fa-bolt'
        },
        {
            title: 'TTL Expiration',
            description:
                'Set time-to-live for cache entries. Expired items are automatically cleaned up.',
            icon: 'fa-solid fa-clock'
        },
        {
            title: 'LRU Eviction',
            description:
                'Smart eviction policy removes least recently used items when the cache reaches max size.',
            icon: 'fa-solid fa-layer-group'
        },
        {
            title: '@cached Decorator',
            description:
                'Automatic method-level caching with a simple decorator. No boilerplate required.',
            icon: 'fa-solid fa-at'
        },
        {
            title: 'TypeScript First',
            description: 'Full type safety with generics. Your cached values are properly typed.',
            icon: 'fa-brands fa-js'
        },
        {
            title: 'Zero Dependencies',
            description: 'Lightweight and self-contained. No bloat, no supply chain risks.',
            icon: 'fa-solid fa-feather'
        }
    ]

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
        // hide until fonts are loaded and spans are built
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
                // Fallback: ensure visible
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
                            <span class="block">Memory</span>
                            <span
                                class="sheen-gradient from-foreground via-brand-500 to-foreground block bg-gradient-to-r bg-clip-text text-transparent"
                            >
                                Cache
                            </span>
                        </h1>
                        <p
                            class="text-muted-foreground mt-6 text-base leading-7 text-pretty md:text-lg"
                        >
                            A high-performance, in-memory caching library for TypeScript. TTL
                            expiration, LRU eviction, and a powerful @cached decorator—all in a
                            zero-dependency package.
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
                                href="/docs/api/memory-cache"
                                class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 focus-visible:ring-brand-600/20 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                                use:springTap
                            >
                                API Reference
                                <i class="fa-solid fa-book ml-2 text-xs"></i>
                            </a>
                            <a
                                href="/examples"
                                class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 focus-visible:ring-brand-600/20 inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2"
                                use:springTap
                            >
                                Examples
                                <i class="fa-solid fa-play ml-2 text-xs"></i>
                            </a>
                        </div>
                        <ul
                            class="text-muted-foreground mt-10 flex flex-wrap justify-center gap-2 text-xs"
                        >
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                Zero Dependencies
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                TypeScript
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                TTL + LRU
                            </li>
                            <li class="border-border-muted rounded-full border px-3 py-1">
                                Decorator Support
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
                        Why Memory Cache
                    </h2>
                    <p class="text-muted-foreground mx-auto max-w-2xl text-lg">
                        Simple, fast, and reliable caching for your TypeScript applications.
                    </p>
                </div>
                <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {#each features as feature}
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

        <!-- Code Example Section -->
        <section class="relative px-6 py-10">
            <div class="container mx-auto max-w-4xl">
                <div class="mb-8 text-center">
                    <h2 class="text-foreground mb-4 text-3xl font-bold">Quick Example</h2>
                    <p class="text-muted-foreground">
                        Get started in seconds with simple, intuitive APIs.
                    </p>
                </div>
                <div
                    class="border-border bg-code-block-background rounded-xl border p-6 font-mono text-sm"
                >
                    <pre class="text-code-block-foreground"><code
                            ><span class="text-brand-500">import</span
                            > {'{'} MemoryCache, cached {'}'} <span class="text-brand-500"
                                >from</span
                            > <span class="text-green-500">'@humanspeak/memory-cache'</span>

<span class="text-muted-foreground">// Create a cache with 5 minute TTL and max 100 items</span>
<span class="text-brand-500">const</span> cache = <span class="text-brand-500">new</span
                            > MemoryCache&lt;<span class="text-yellow-500">User</span>&gt;({'{'}
    ttl: <span class="text-orange-500">300000</span>,
    maxSize: <span class="text-orange-500">100</span>
{'}'})

<span class="text-muted-foreground">// Simple get/set operations</span>
cache.set(<span class="text-green-500">'user:123'</span>, {'{'} name: <span class="text-green-500"
                                >'Alice'</span
                            > {'}'})
<span class="text-brand-500">const</span> user = cache.get(<span class="text-green-500"
                                >'user:123'</span
                            >)

<span class="text-muted-foreground">// Or use the @cached decorator</span>
<span class="text-brand-500">class</span> <span class="text-yellow-500">UserService</span> {'{'}
    <span class="text-purple-500">@cached</span>({'{'} ttl: <span class="text-orange-500"
                                >60000</span
                            > {'}'})
    <span class="text-brand-500">async</span> getUser(id: <span class="text-yellow-500">string</span
                            >) {'{'}
        <span class="text-brand-500">return</span> <span class="text-brand-500">await</span
                            > fetchUserFromDb(id)
    {'}'}
{'}'}</code
                        ></pre>
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
