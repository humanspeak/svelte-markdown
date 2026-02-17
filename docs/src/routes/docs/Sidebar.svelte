<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import { onMount } from 'svelte'

    const { currentPath } = $props()

    type NavItem = {
        title: string
        href: string
        icon: string
        external?: boolean
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

    const navigation = $derived<NavSection[]>([
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
            title: 'API Reference',
            items: [
                {
                    title: 'SvelteMarkdown',
                    href: '/docs/api/svelte-markdown',
                    icon: 'fa-solid fa-cube'
                },
                {
                    title: 'Types & Exports',
                    href: '/docs/api/types',
                    icon: 'fa-solid fa-code'
                }
            ]
        },
        {
            title: 'Renderers',
            items: [
                {
                    title: 'Markdown Renderers',
                    href: '/docs/renderers/markdown-renderers',
                    icon: 'fa-solid fa-list'
                },
                {
                    title: 'HTML Renderers',
                    href: '/docs/renderers/html-renderers',
                    icon: 'fa-brands fa-html5'
                },
                {
                    title: 'Custom Renderers',
                    href: '/docs/renderers/custom-renderers',
                    icon: 'fa-solid fa-paintbrush'
                }
            ]
        },
        {
            title: 'Advanced',
            items: [
                {
                    title: 'Token Caching',
                    href: '/docs/advanced/token-caching',
                    icon: 'fa-solid fa-bolt'
                },
                {
                    title: 'Allow/Deny',
                    href: '/docs/advanced/allow-deny',
                    icon: 'fa-solid fa-shield'
                },
                {
                    title: 'Security',
                    href: '/docs/advanced/security',
                    icon: 'fa-solid fa-lock'
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
                    title: 'Basic Rendering',
                    href: '/docs/examples/basic-rendering',
                    icon: 'fa-solid fa-file-lines'
                },
                {
                    title: 'Custom Renderers',
                    href: '/docs/examples/custom-renderers',
                    icon: 'fa-solid fa-paintbrush'
                },
                {
                    title: 'HTML Filtering',
                    href: '/docs/examples/html-filtering',
                    icon: 'fa-solid fa-filter'
                },
                {
                    title: 'Inline Rendering',
                    href: '/docs/examples/inline-rendering',
                    icon: 'fa-solid fa-i-cursor'
                },
                {
                    title: 'Parsed Callback',
                    href: '/docs/examples/parsed-callback',
                    icon: 'fa-solid fa-diagram-project'
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
                    title: 'Live Playground',
                    href: '/examples/playground',
                    icon: 'fa-solid fa-pen-to-square'
                },
                {
                    title: 'Custom Renderers',
                    href: '/examples/custom-renderers',
                    icon: 'fa-solid fa-paintbrush'
                },
                {
                    title: 'HTML Filtering',
                    href: '/examples/html-filtering',
                    icon: 'fa-solid fa-filter'
                },
                {
                    title: 'Caching Performance',
                    href: '/examples/caching-performance',
                    icon: 'fa-solid fa-gauge-high'
                }
            ]
        },
        {
            title: 'Love and Respect',
            items: [
                {
                    title: 'Beye.ai',
                    href: 'https://beye.ai',
                    icon: 'fa-solid fa-heart',
                    external: true
                }
            ]
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
                icon: 'fa-solid fa-heart',
                external: true
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
                        <motion.li
                            whileHover={{ x: 2 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        >
                            <a
                                href={item.href}
                                target={item?.external ? '_blank' : undefined}
                                rel={item?.external ? 'noopener' : undefined}
                                class="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150
						     	{isActive(item.href)
                                    ? 'bg-sidebar-active text-sidebar-active-foreground'
                                    : 'text-sidebar-foreground hover:bg-muted hover:text-text-primary'}"
                            >
                                {#if item.icon}
                                    <motion.span
                                        class="mr-3 inline-flex"
                                        whileHover={{ scale: 1.25 }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                                    >
                                        <i
                                            class="{item.icon} fa-fw text-sm {isActive(item.href)
                                                ? 'text-sidebar-active-foreground'
                                                : 'text-text-muted group-hover:text-text-secondary'}"
                                        ></i>
                                    </motion.span>
                                {:else}
                                    <i
                                        class="fa-solid fa-arrow-right fa-fw text-text-muted mr-3 text-xs"
                                    ></i>
                                {/if}
                                {item.title}
                                {#if item?.external}
                                    <i
                                        class="fa-solid fa-arrow-up-right-from-square ml-2 text-xs opacity-50"
                                    ></i>
                                {/if}
                            </a>
                        </motion.li>
                    {/each}
                </ul>
            </div>
        {/each}
    </div>
</nav>
