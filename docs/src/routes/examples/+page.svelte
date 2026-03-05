<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Icon from '$lib/components/general/Icon.svelte'
    import { ArrowRight, Rocket } from '@lucide/svelte'
    import type { IconName } from '$lib/icons'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Interactive Examples | Svelte Markdown'
        seo.description =
            'Explore interactive examples of @humanspeak/svelte-markdown featuring a live playground, custom renderers, HTML filtering, and caching performance demos.'
        seo.ogTitle = 'Interactive Examples'
        seo.ogTagline = 'Live demos of markdown rendering features.'
        seo.ogFeatures = ['Live Editors', '8 Demos', 'Source Code', 'Try It Now']
        seo.ogSlug = 'examples'
    }

    const examples: { slug: string; title: string; description: string; icon: IconName }[] = [
        {
            slug: 'playground',
            title: 'Live Playground',
            description:
                'Edit markdown in real-time and see it rendered instantly. Mix markdown with HTML tags.',
            icon: 'square-pen'
        },
        {
            slug: 'custom-renderers',
            title: 'Custom Renderers',
            description:
                'See how to override default renderers and control which markdown elements are rendered.',
            icon: 'paintbrush'
        },
        {
            slug: 'html-filtering',
            title: 'HTML Filtering',
            description:
                'Interactive demo of allow/deny controls for HTML tags within markdown content.',
            icon: 'filter'
        },
        {
            slug: 'caching-performance',
            title: 'Caching Performance',
            description:
                'Explore token caching and see the performance improvement on repeated renders.',
            icon: 'gauge'
        },
        {
            slug: 'marked-extensions',
            title: 'Marked Extensions',
            description:
                'Live KaTeX math rendering with the extensions prop. Try component renderers and snippet overrides.',
            icon: 'puzzle'
        },
        {
            slug: 'mermaid',
            title: 'Mermaid Diagrams',
            description:
                'Async Mermaid diagram rendering with a custom marked extension. Flowcharts, sequence diagrams, and more.',
            icon: 'workflow'
        },
        {
            slug: 'github-alerts',
            title: 'GitHub Alerts',
            description:
                'GitHub-style alert admonitions (NOTE, TIP, IMPORTANT, WARNING, CAUTION) with the built-in markedAlert extension.',
            icon: 'triangle-alert'
        },
        {
            slug: 'footnotes',
            title: 'Footnotes',
            description:
                'Footnote references and definitions with bidirectional linking using the built-in markedFootnote extension.',
            icon: 'superscript'
        },
        {
            slug: 'code-formatting',
            title: 'Code Formatting',
            description:
                'Enhance code blocks with walkTokens extensions and snippet overrides. No custom renderers required.',
            icon: 'code'
        },
        {
            slug: 'snippet-overrides',
            title: 'Snippet Overrides',
            description:
                'Customize rendering inline with Svelte 5 snippets. No separate component files needed.',
            icon: 'scissors'
        },
        {
            slug: 'linked-headings',
            title: 'Linked Headings',
            description:
                'Add clickable anchor links to headings with snippet overrides or custom renderers for easy deep-linking.',
            icon: 'link'
        }
    ]
</script>

<div class="container mx-auto px-4 py-12">
    <!-- Hero Section -->
    <div class="mb-12 text-center">
        <h1
            class="from-brand-500 to-brand-600 mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
        >
            Interactive Examples
        </h1>
        <p class="text-muted-foreground mx-auto max-w-2xl text-lg">
            Explore how svelte-markdown works with live, interactive demos. Edit markdown, customize
            renderers, filter HTML, and measure caching performance.
        </p>
    </div>

    <!-- Examples Grid -->
    <div class="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        {#each examples as example, index}
            <a
                href="/examples/{example.slug}"
                class="example-card group border-border bg-card hover:border-brand-500/50 hover:shadow-brand-500/10 relative overflow-hidden rounded-xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
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
                        <Icon name={example.icon} class="size-4.5" />
                    </div>

                    <h2
                        class="text-foreground group-hover:text-brand-600 mb-2 text-xl font-semibold transition-colors"
                    >
                        {example.title}
                    </h2>

                    <p class="text-muted-foreground mb-4 text-sm">
                        {example.description}
                    </p>

                    <div
                        class="text-brand-600 group-hover:text-brand-700 flex items-center text-sm font-medium"
                    >
                        Try it
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
                Ready to use Svelte Markdown?
            </h2>
            <p class="text-muted-foreground mb-6">
                Check out the documentation for installation and API reference.
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
    .example-card {
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
