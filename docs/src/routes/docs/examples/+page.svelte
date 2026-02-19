<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'

    const breadcrumbs = $derived(getBreadcrumbContext())
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [{ title: 'Docs', href: '/docs' }, { title: 'Examples' }]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Usage Examples | Svelte Markdown'
        seo.description =
            'Real-world usage examples for @humanspeak/svelte-markdown covering basic rendering, custom renderers, HTML filtering, inline rendering, and the parsed callback.'
    }

    const examples = [
        {
            category: 'Getting Started',
            items: [
                {
                    title: 'Basic Rendering',
                    description:
                        'Render markdown content with the SvelteMarkdown component. Covers string input, GFM, and common patterns.',
                    href: '/docs/examples/basic-rendering',
                    icon: 'fa-solid fa-file-lines'
                },
                {
                    title: 'Inline Rendering',
                    description:
                        'Use the isInline prop to render markdown without wrapping block elements.',
                    href: '/docs/examples/inline-rendering',
                    icon: 'fa-solid fa-i-cursor'
                }
            ]
        },
        {
            category: 'Customization',
            items: [
                {
                    title: 'Custom Renderers',
                    description:
                        'Override default renderers with your own Svelte components for full control over output.',
                    href: '/docs/examples/custom-renderers',
                    icon: 'fa-solid fa-paintbrush'
                },
                {
                    title: 'HTML Filtering',
                    description:
                        'Use allow/deny utilities to control which HTML tags are rendered from markdown.',
                    href: '/docs/examples/html-filtering',
                    icon: 'fa-solid fa-filter'
                }
            ]
        },
        {
            category: 'Advanced',
            items: [
                {
                    title: 'Parsed Callback',
                    description:
                        'Access parsed token data via the parsed callback prop for debugging or processing.',
                    href: '/docs/examples/parsed-callback',
                    icon: 'fa-solid fa-diagram-project'
                },
                {
                    title: 'Marked Extensions',
                    description:
                        'Integrate third-party marked extensions like KaTeX math rendering with custom Svelte renderers.',
                    href: '/docs/advanced/marked-extensions',
                    icon: 'fa-solid fa-puzzle-piece'
                }
            ]
        }
    ]

    const quickReference = [
        {
            useCase: 'Blog posts',
            component: '<SvelteMarkdown source={post.body} />',
            notes: 'Full block rendering'
        },
        {
            useCase: 'Inline labels',
            component: '<SvelteMarkdown source={label} isInline />',
            notes: 'No wrapping <p> tags'
        },
        {
            useCase: 'Sanitized content',
            component: '<SvelteMarkdown {source} renderers={{ html: allowHtmlOnly([...]) }} />',
            notes: 'Restrict HTML tags'
        },
        {
            useCase: 'Custom styling',
            component: '<SvelteMarkdown {source} renderers={{ heading: MyHeading }} />',
            notes: 'Override specific renderers'
        },
        {
            useCase: 'Token inspection',
            component: '<SvelteMarkdown {source} parsed={handleTokens} />',
            notes: 'Access AST tokens'
        }
    ]
</script>

<!-- Hero Section -->
<div class="not-prose mb-10">
    <h1 class="text-foreground mb-3 text-4xl font-bold">Usage Examples</h1>
    <p class="text-muted-foreground max-w-2xl text-lg">
        Explore practical examples of how to use @humanspeak/svelte-markdown in real-world
        scenarios.
    </p>
</div>

<!-- Examples Grid by Category -->
{#each examples as category, categoryIndex}
    <div class="not-prose mb-10">
        <h2 class="text-foreground mb-4 text-xl font-semibold">{category.category}</h2>
        <div class="grid gap-4 sm:grid-cols-2">
            {#each category.items as example, itemIndex}
                <a
                    href={example.href}
                    class="example-card group border-border bg-card hover:border-brand-500/50 hover:shadow-brand-500/10 relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    style="animation-delay: {(categoryIndex * 3 + itemIndex) * 50}ms"
                >
                    <!-- Gradient overlay on hover -->
                    <div
                        class="from-brand-500/5 absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    ></div>

                    <!-- Content -->
                    <div class="relative z-10">
                        <!-- Icon -->
                        <div
                            class="from-brand-500 to-brand-600 mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white transition-transform duration-300 group-hover:scale-110"
                        >
                            <i class={example.icon}></i>
                        </div>

                        <h3
                            class="text-foreground group-hover:text-brand-600 mb-1.5 text-lg font-semibold transition-colors"
                        >
                            {example.title}
                        </h3>

                        <p class="text-muted-foreground mb-3 line-clamp-2 text-sm">
                            {example.description}
                        </p>

                        <!-- View link -->
                        <div
                            class="text-brand-600 group-hover:text-brand-700 flex items-center text-sm font-medium"
                        >
                            View Example
                            <i
                                class="fa-solid fa-arrow-right ml-2 transition-transform duration-200 group-hover:translate-x-1"
                            ></i>
                        </div>
                    </div>

                    <!-- Decorative corner -->
                    <div
                        class="from-brand-500/10 absolute top-0 right-0 h-16 w-16 rounded-bl-full bg-gradient-to-bl to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    ></div>
                </a>
            {/each}
        </div>
    </div>
{/each}

<!-- Quick Reference Section -->
<div class="not-prose mb-10">
    <h2 class="text-foreground mb-4 text-xl font-semibold">Quick Reference</h2>
    <div class="border-border overflow-x-auto rounded-xl border">
        <table class="w-full text-sm">
            <thead class="bg-muted/50">
                <tr>
                    <th class="text-foreground px-4 py-3 text-left font-medium">Use Case</th>
                    <th class="text-foreground px-4 py-3 text-left font-medium">Usage</th>
                    <th class="text-foreground px-4 py-3 text-left font-medium">Notes</th>
                </tr>
            </thead>
            <tbody class="divide-border divide-y">
                {#each quickReference as row}
                    <tr class="hover:bg-muted/30 transition-colors">
                        <td class="text-foreground px-4 py-3">{row.useCase}</td>
                        <td class="px-4 py-3">
                            <code class="bg-muted text-brand-600 rounded px-1.5 py-0.5 text-xs"
                                >{row.component}</code
                            >
                        </td>
                        <td class="text-muted-foreground px-4 py-3">{row.notes}</td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<!-- Best Practices Section -->
<div class="not-prose">
    <h2 class="text-foreground mb-4 text-xl font-semibold">Best Practices</h2>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {#each [{ icon: 'fa-solid fa-shield', title: 'Filter untrusted HTML', description: 'Use allowHtmlOnly/excludeHtmlOnly for user content' }, { icon: 'fa-solid fa-bolt', title: 'Leverage token caching', description: 'Repeated renders are 50-200x faster automatically' }, { icon: 'fa-solid fa-paintbrush', title: 'Use custom renderers', description: 'Override specific elements for custom styling' }, { icon: 'fa-solid fa-code', title: 'Use isInline for labels', description: 'Avoid block-level wrapping for inline content' }, { icon: 'fa-solid fa-diagram-project', title: 'Inspect tokens when debugging', description: 'Use the parsed callback to see the AST' }] as practice}
            <div class="border-border bg-card flex items-start gap-3 rounded-lg border p-4">
                <div
                    class="bg-brand-500/10 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
                >
                    <i class="{practice.icon} text-sm"></i>
                </div>
                <div>
                    <h3 class="text-foreground font-medium">{practice.title}</h3>
                    <p class="text-muted-foreground text-sm">{practice.description}</p>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .example-card {
        animation: fadeInUp 0.5s ease-out both;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(12px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
