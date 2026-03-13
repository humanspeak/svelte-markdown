<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import { competitors } from '$lib/compare-data'
    import { ArrowRight, Rocket, Swords } from '@lucide/svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Compare | Svelte Markdown vs Alternatives'
        seo.description =
            'See how @humanspeak/svelte-markdown compares to MDsveX, Tiptap, markdown-it, marked, Milkdown, and more. Honest feature comparisons for every Svelte markdown library.'
        seo.ogTitle = 'Svelte Markdown vs Alternatives'
        seo.ogTagline = 'Honest comparisons with every major option.'
        seo.ogFeatures = ['10 Comparisons', 'Feature Tables', 'Honest Pros/Cons', 'Use Case Guides']
        seo.ogSlug = 'compare'
    }
</script>

<div class="container mx-auto px-4 py-12">
    <!-- Hero Section -->
    <div class="mb-12 text-center">
        <div
            class="from-brand-500 to-brand-600 mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br text-white"
        >
            <Swords class="size-7" />
        </div>
        <h1
            class="from-brand-500 to-brand-600 mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
        >
            Compare Svelte Markdown
        </h1>
        <p class="text-muted-foreground mx-auto max-w-2xl text-lg">
            Honest, detailed comparisons with every major Svelte markdown library and editor. We
            show where we shine and where alternatives might be a better fit.
        </p>
    </div>

    <!-- Comparisons Grid -->
    <div class="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {#each competitors as competitor, index}
            <a
                href="/compare/{competitor.slug}"
                class="compare-card group border-border bg-card hover:border-brand-500/50 hover:shadow-brand-500/10 relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                style="animation-delay: {index * 100}ms"
            >
                <!-- Gradient overlay -->
                <div
                    class="from-brand-500/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                ></div>

                <div class="relative z-10">
                    <!-- Icon -->
                    <div
                        class="from-brand-500 to-brand-600 mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br text-white transition-transform duration-300 group-hover:scale-110"
                    >
                        <Swords class="size-4.5" />
                    </div>

                    <h2
                        class="text-foreground group-hover:text-brand-600 mb-1 text-xl font-semibold transition-colors"
                    >
                        vs {competitor.name}
                    </h2>

                    <p class="text-muted-foreground mb-1 text-xs font-medium">
                        {competitor.type}
                    </p>

                    <p class="text-muted-foreground mb-4 text-sm">
                        {competitor.tagline}
                    </p>

                    <div
                        class="text-brand-600 group-hover:text-brand-700 flex items-center text-sm font-medium"
                    >
                        Compare
                        <ArrowRight
                            class="ml-2 size-4 transition-transform duration-200 group-hover:translate-x-1"
                        />
                    </div>
                </div>

                <!-- Decorative corner -->
                <div
                    class="from-brand-500/10 absolute top-0 right-0 h-20 w-20 rounded-bl-full bg-gradient-to-bl to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                ></div>
            </a>
        {/each}
    </div>

    <!-- CTA Section -->
    <div class="mt-16 text-center">
        <div
            class="border-brand-500/20 from-brand-500/10 to-brand-600/10 mx-auto max-w-xl rounded-2xl border bg-gradient-to-r p-8"
        >
            <h2 class="text-foreground mb-3 text-xl font-semibold">
                Ready to try Svelte Markdown?
            </h2>
            <p class="text-muted-foreground mb-6">
                Install in seconds and render your first markdown.
            </p>
            <a
                href="/docs/getting-started"
                class="from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 inline-flex items-center rounded-lg bg-gradient-to-r px-5 py-2.5 font-medium text-white transition-all duration-200"
            >
                Get Started
                <Rocket class="ml-2 size-4" />
            </a>
        </div>
    </div>
</div>

<style>
    .compare-card {
        animation: fadeInUp 0.5s ease-out both;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(16px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
