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
        seo.title = 'Usage Examples | Memory Cache'
        seo.description =
            'Real-world usage examples for @humanspeak/memory-cache covering API caching, session storage, database queries, rate limiting, and the @cached decorator.'
    }

    const examples = [
        {
            category: 'Basic Patterns',
            items: [
                {
                    title: 'API Response Caching',
                    description:
                        'Cache API responses to reduce network requests and improve response times.',
                    href: '/docs/examples/api-caching',
                    icon: 'fa-solid fa-cloud'
                },
                {
                    title: 'Session Storage',
                    description:
                        'Store user sessions with automatic expiration for secure session management.',
                    href: '/docs/examples/sessions',
                    icon: 'fa-solid fa-user-shield'
                },
                {
                    title: 'Configuration Cache',
                    description:
                        'Cache configuration that rarely changes for faster application startup.',
                    href: '/docs/examples/configuration',
                    icon: 'fa-solid fa-sliders'
                }
            ]
        },
        {
            category: 'Advanced Patterns',
            items: [
                {
                    title: 'Database Query Caching',
                    description: 'Cache expensive database queries with the @cached decorator.',
                    href: '/docs/examples/database-caching',
                    icon: 'fa-solid fa-database'
                },
                {
                    title: 'Computed Value Caching',
                    description: 'Cache expensive computations to avoid redundant processing.',
                    href: '/docs/examples/computed-values',
                    icon: 'fa-solid fa-calculator'
                },
                {
                    title: 'Multi-Tenant Invalidation',
                    description: 'Use prefix and wildcard deletion for multi-tenant applications.',
                    href: '/docs/examples/multi-tenant',
                    icon: 'fa-solid fa-building'
                },
                {
                    title: 'Async Fetching',
                    description: 'Handle async data fetching with automatic caching.',
                    href: '/docs/examples/async-fetching',
                    icon: 'fa-solid fa-rotate'
                }
            ]
        },
        {
            category: 'Monitoring & Operations',
            items: [
                {
                    title: 'Monitoring with Hooks',
                    description: 'Integrate with metrics and logging systems for observability.',
                    href: '/docs/examples/monitoring',
                    icon: 'fa-solid fa-chart-line'
                },
                {
                    title: 'Rate Limiting',
                    description: 'Implement simple rate limiting using the cache.',
                    href: '/docs/examples/rate-limiting',
                    icon: 'fa-solid fa-gauge-high'
                }
            ]
        },
        {
            category: 'Full Examples',
            items: [
                {
                    title: 'Service Class Pattern',
                    description: 'Complete service class example using the @cached decorator.',
                    href: '/docs/examples/service-class',
                    icon: 'fa-solid fa-code'
                }
            ]
        }
    ]

    const quickReference = [
        {
            useCase: 'API responses',
            ttl: '1-5 minutes',
            maxSize: '500-1000',
            keyPattern: 'api:{endpoint}'
        },
        {
            useCase: 'User sessions',
            ttl: '30-60 minutes',
            maxSize: '10000+',
            keyPattern: 'session:{id}'
        },
        {
            useCase: 'Database queries',
            ttl: '30s-5 minutes',
            maxSize: '100-500',
            keyPattern: 'query:{table}:{id}'
        },
        {
            useCase: 'Computed values',
            ttl: '0 (no expiration)',
            maxSize: '1000+',
            keyPattern: 'compute:{input}'
        },
        {
            useCase: 'Rate limiting',
            ttl: '1 minute',
            maxSize: '100000+',
            keyPattern: 'ratelimit:{clientId}'
        },
        {
            useCase: 'Configuration',
            ttl: '5-10 minutes',
            maxSize: '100',
            keyPattern: 'config:{env}'
        }
    ]
</script>

<!-- Hero Section -->
<div class="not-prose mb-10">
    <h1 class="text-foreground mb-3 text-4xl font-bold">Usage Examples</h1>
    <p class="text-muted-foreground max-w-2xl text-lg">
        Explore practical examples of how to use @humanspeak/memory-cache in real-world scenarios.
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
                    <th class="text-foreground px-4 py-3 text-left font-medium">Recommended TTL</th>
                    <th class="text-foreground px-4 py-3 text-left font-medium">Max Size</th>
                    <th class="text-foreground px-4 py-3 text-left font-medium">Key Pattern</th>
                </tr>
            </thead>
            <tbody class="divide-border divide-y">
                {#each quickReference as row}
                    <tr class="hover:bg-muted/30 transition-colors">
                        <td class="text-foreground px-4 py-3">{row.useCase}</td>
                        <td class="text-muted-foreground px-4 py-3">{row.ttl}</td>
                        <td class="text-muted-foreground px-4 py-3">{row.maxSize}</td>
                        <td class="px-4 py-3">
                            <code class="bg-muted text-brand-600 rounded px-1.5 py-0.5 text-xs"
                                >{row.keyPattern}</code
                            >
                        </td>
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
        {#each [{ icon: 'fa-solid fa-clock', title: 'Choose appropriate TTLs', description: 'Balance freshness vs performance' }, { icon: 'fa-solid fa-key', title: 'Use meaningful key patterns', description: 'Makes debugging and invalidation easier' }, { icon: 'fa-solid fa-memory', title: 'Consider cache size', description: 'Monitor memory usage in production' }, { icon: 'fa-solid fa-eye', title: 'Use hooks for observability', description: 'Track hit rates and performance' }, { icon: 'fa-solid fa-shield', title: 'Handle cache misses', description: 'Always have a fallback strategy' }] as practice}
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
