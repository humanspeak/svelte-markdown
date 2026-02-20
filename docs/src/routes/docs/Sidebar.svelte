<!--
  Left sidebar navigation component
  Hierarchical structure with FontAwesome icons and proper styling
-->
<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import { onMount } from 'svelte'
    import { slide } from 'svelte/transition'
    import { PersistedState } from 'runed'

    const { currentPath } = $props()

    type NavItem = {
        title: string
        href: string
        icon: string
        external?: boolean
    }

    type NavSection = {
        title: string
        icon: string
        items: NavItem[]
    }

    type OtherProject = {
        url: string
        slug: string
        shortDescription: string
    }

    let otherProjects: NavItem[] = $state([])
    const openSections = new PersistedState<Record<string, boolean>>('sidebar-sections', {})

    const navigation: NavSection[] = $derived([
        {
            title: 'Get Started',
            icon: 'fa-solid fa-rocket',
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
            icon: 'fa-solid fa-book',
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
            icon: 'fa-solid fa-paintbrush',
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
                },
                {
                    title: 'Snippet Overrides',
                    href: '/docs/renderers/snippet-overrides',
                    icon: 'fa-solid fa-scissors'
                }
            ]
        },
        {
            title: 'Advanced',
            icon: 'fa-solid fa-gear',
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
                },
                {
                    title: 'Marked Extensions',
                    href: '/docs/advanced/marked-extensions',
                    icon: 'fa-solid fa-puzzle-piece'
                }
            ]
        },
        {
            title: 'Examples',
            icon: 'fa-solid fa-code',
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
                    title: 'Snippet Overrides',
                    href: '/docs/examples/snippet-overrides',
                    icon: 'fa-solid fa-scissors'
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
            icon: 'fa-solid fa-play',
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
                    title: 'Snippet Overrides',
                    href: '/examples/snippet-overrides',
                    icon: 'fa-solid fa-scissors'
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
                },
                {
                    title: 'Marked Extensions',
                    href: '/examples/marked-extensions',
                    icon: 'fa-solid fa-puzzle-piece'
                },
                {
                    title: 'Mermaid Diagrams',
                    href: '/examples/mermaid',
                    icon: 'fa-solid fa-diagram-project'
                }
            ]
        },
        {
            title: 'Love and Respect',
            icon: 'fa-solid fa-heart',
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
                      icon: 'fa-solid fa-cube',
                      items: otherProjects
                  }
              ]
            : [])
    ])

    const isSectionOpen = (section: NavSection): boolean => {
        if (section.title in openSections.current) return openSections.current[section.title]
        return true
    }

    const toggleSection = (section: NavSection) => {
        openSections.current = {
            ...openSections.current,
            [section.title]: !isSectionOpen(section)
        }
    }

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

    const formatTitle = (slug: string): string => slug.toLowerCase()

    const isActive = (href: string) => {
        const basePath = currentPath.split(/[?#]/)[0]
        if (href === '/docs' || href === '/docs/examples') {
            return (
                basePath === href ||
                currentPath.startsWith(`${href}?`) ||
                currentPath.startsWith(`${href}#`)
            )
        }
        return (
            basePath === href ||
            currentPath.startsWith(`${href}?`) ||
            currentPath.startsWith(`${href}#`) ||
            basePath.startsWith(`${href}/`)
        )
    }
</script>

<nav class="p-2">
    <div class="space-y-2">
        {#each navigation as section (section.title)}
            <div>
                <button
                    onclick={() => toggleSection(section)}
                    class="text-text-primary hover:bg-muted flex w-full items-center justify-between rounded-md px-3 py-1.5 text-sm font-semibold tracking-wide uppercase transition-colors duration-150"
                >
                    <span class="flex items-center gap-2 text-left">
                        <motion.span
                            class="inline-flex shrink-0"
                            whileHover={{ scale: 1.25 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                        >
                            <i class="{section.icon} fa-fw text-muted-foreground text-sm"></i>
                        </motion.span>
                        {section.title}
                    </span>
                    <i
                        class="fa-solid fa-chevron-down text-muted-foreground shrink-0 text-xs transition-transform duration-200 {isSectionOpen(
                            section
                        )
                            ? 'rotate-180'
                            : ''}"
                    ></i>
                </button>
                {#if isSectionOpen(section)}
                    <ul
                        class="border-border mt-1 ml-3 space-y-1 border-l pl-1"
                        transition:slide={{ duration: 200 }}
                    >
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
                                        ? 'bg-accent text-accent-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'}"
                                >
                                    {#if item.icon}
                                        <motion.span
                                            class="mr-3 inline-flex"
                                            whileHover={{ scale: 1.25 }}
                                            transition={{
                                                type: 'spring',
                                                stiffness: 500,
                                                damping: 15
                                            }}
                                        >
                                            <i
                                                class="{item.icon} fa-fw text-sm {isActive(
                                                    item.href
                                                )
                                                    ? 'text-accent-foreground'
                                                    : 'text-muted-foreground group-hover:text-foreground'}"
                                            ></i>
                                        </motion.span>
                                    {:else}
                                        <i
                                            class="fa-solid fa-arrow-right fa-fw text-muted-foreground mr-3 text-xs"
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
                {/if}
            </div>
        {/each}
    </div>
</nav>
