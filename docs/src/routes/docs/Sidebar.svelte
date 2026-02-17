<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
    import { onMount } from 'svelte'

    const { currentPath } = $props()

    type NavItem = {
        title: string
        href: string
        icon: string
    }

    type NavSection = {
        title: string
        items: NavItem[]
    }

    type OtherProject = {
        url: string
        slug: string
        shortDescription: string
    }

    let otherProjects: NavItem[] = $state([])

    // Navigation aligned with memory-cache documentation structure
    let navigation = $derived<NavSection[]>([
        {
            title: 'Get Started',
            items: [
                {
                    title: 'Getting Started',
                    href: '/docs/getting-started',
                    icon: 'fa-solid fa-rocket'
                }
            ]
        },
        {
            title: 'Interactive Demos',
            items: [
                {
                    title: 'All Examples',
                    href: '/examples',
                    icon: 'fa-solid fa-play'
                },
                {
                    title: 'Basic Cache',
                    href: '/examples/basic-cache',
                    icon: 'fa-solid fa-box'
                },
                {
                    title: 'TTL Expiration',
                    href: '/examples/ttl-expiration',
                    icon: 'fa-solid fa-clock'
                },
                {
                    title: 'LRU Eviction',
                    href: '/examples/lru-eviction',
                    icon: 'fa-solid fa-layer-group'
                },
                {
                    title: 'Cache Statistics',
                    href: '/examples/cache-statistics',
                    icon: 'fa-solid fa-chart-line'
                }
            ]
        },
        {
            title: 'API Reference',
            items: [
                {
                    title: 'MemoryCache',
                    href: '/docs/api/memory-cache',
                    icon: 'fa-solid fa-database'
                },
                {
                    title: '@cached Decorator',
                    href: '/docs/api/cached-decorator',
                    icon: 'fa-solid fa-at'
                }
            ]
        },
        {
            title: 'Examples',
            items: [
                {
                    title: 'Overview',
                    href: '/docs/examples',
                    icon: 'fa-solid fa-code'
                },
                {
                    title: 'Configuration',
                    href: '/docs/examples/configuration',
                    icon: 'fa-solid fa-sliders'
                },
                {
                    title: 'API Caching',
                    href: '/docs/examples/api-caching',
                    icon: 'fa-solid fa-cloud'
                },
                {
                    title: 'Async Fetching',
                    href: '/docs/examples/async-fetching',
                    icon: 'fa-solid fa-rotate'
                },
                {
                    title: 'Computed Values',
                    href: '/docs/examples/computed-values',
                    icon: 'fa-solid fa-calculator'
                },
                {
                    title: 'Database Caching',
                    href: '/docs/examples/database-caching',
                    icon: 'fa-solid fa-database'
                },
                {
                    title: 'Monitoring',
                    href: '/docs/examples/monitoring',
                    icon: 'fa-solid fa-chart-line'
                },
                {
                    title: 'Multi-Tenant',
                    href: '/docs/examples/multi-tenant',
                    icon: 'fa-solid fa-building'
                },
                {
                    title: 'Rate Limiting',
                    href: '/docs/examples/rate-limiting',
                    icon: 'fa-solid fa-gauge-high'
                },
                {
                    title: 'Service Class',
                    href: '/docs/examples/service-class',
                    icon: 'fa-solid fa-cube'
                },
                {
                    title: 'Sessions',
                    href: '/docs/examples/sessions',
                    icon: 'fa-solid fa-user-clock'
                }
            ]
        },
        {
            title: 'Love and Respect',
            items: [{ title: 'Beye.ai', href: 'https://beye.ai', icon: 'fa-solid fa-heart' }]
        },
        ...(otherProjects.length > 0
            ? [
                  {
                      title: 'Other Projects',
                      items: otherProjects
                  }
              ]
            : [])
    ])

    onMount(async () => {
        try {
            const response = await fetch('/api/other-projects')
            if (!response.ok) {
                return
            }
            const projects: OtherProject[] = await response.json()

            // Convert to nav items format
            otherProjects = projects.map((project) => ({
                title: formatTitle(project.slug),
                href: project.url,
                icon: 'fa-solid fa-heart'
            }))
        } catch (error) {
            console.error('Failed to load other projects:', error)
        }
    })

    function formatTitle(slug: string): string {
        return `/${slug.toLowerCase()}`
    }

    /**
     * @param {string} href
     * @returns {boolean}
     */
    function isActive(href: string) {
        const basePath = currentPath.split(/[?#]/)[0]
        if (href === '/docs' || href === '/docs/examples') {
            // Only mark index pages active for the exact page or when query/hash is present
            return (
                basePath === href ||
                currentPath.startsWith(`${href}?`) ||
                currentPath.startsWith(`${href}#`)
            )
        }
        // Exact match, same page with query/hash, or a true nested path ("href/...")
        return (
            basePath === href ||
            currentPath.startsWith(`${href}?`) ||
            currentPath.startsWith(`${href}#`) ||
            basePath.startsWith(`${href}/`)
        )
    }
</script>

<nav class="p-6">
    <div class="space-y-8">
        {#each navigation as section (section.title)}
            <div>
                <h3 class="text-text-primary mb-3 text-sm font-semibold tracking-wide uppercase">
                    {section.title}
                </h3>
                <ul class="space-y-1">
                    {#each section.items as item (item.href)}
                        <li>
                            <a
                                href={item.href}
                                class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150
						     	{isActive(item.href)
                                    ? 'bg-sidebar-active text-sidebar-active-foreground'
                                    : 'text-sidebar-foreground hover:bg-muted hover:text-text-primary'}"
                            >
                                {#if item.icon}
                                    <i
                                        class="{item.icon} mr-3 text-sm {isActive(item.href)
                                            ? 'text-sidebar-active-foreground'
                                            : 'text-text-muted group-hover:text-text-secondary'}"
                                    ></i>
                                {:else}
                                    <i class="fa-solid fa-arrow-right text-text-muted mr-3 text-xs"
                                    ></i>
                                {/if}
                                {item.title}
                            </a>
                        </li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>
</nav>
