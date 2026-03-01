<!--
  Left sidebar navigation component
  Hierarchical structure with Lucide icons and proper styling
-->
<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import { slide } from 'svelte/transition'
    import { PersistedState } from 'runed'
    import Icon from '$lib/components/general/Icon.svelte'
    import { ChevronDown, ArrowRight, ExternalLink } from '@lucide/svelte'
    import type { IconName } from '$lib/icons'

    type NavItem = {
        title: string
        href: string
        icon: IconName
        external?: boolean
    }

    type NavSection = {
        title: string
        icon: IconName
        items: NavItem[]
    }

    const { currentPath, otherProjects = [] }: { currentPath: string; otherProjects: NavItem[] } =
        $props()
    const openSections = new PersistedState<Record<string, boolean>>('sidebar-sections', {})

    const navigation: NavSection[] = $derived([
        {
            title: 'Get Started',
            icon: 'rocket',
            items: [
                {
                    title: 'Getting Started',
                    href: '/docs/getting-started',
                    icon: 'rocket'
                },
                {
                    title: 'Migration Guide',
                    href: '/docs/migration',
                    icon: 'arrow-right-left'
                }
            ]
        },
        {
            title: 'API Reference',
            icon: 'book-open',
            items: [
                {
                    title: 'SvelteMarkdown',
                    href: '/docs/api/svelte-markdown',
                    icon: 'box'
                },
                {
                    title: 'Types & Exports',
                    href: '/docs/api/types',
                    icon: 'code'
                }
            ]
        },
        {
            title: 'Renderers',
            icon: 'paintbrush',
            items: [
                {
                    title: 'Markdown Renderers',
                    href: '/docs/renderers/markdown-renderers',
                    icon: 'list'
                },
                {
                    title: 'HTML Renderers',
                    href: '/docs/renderers/html-renderers',
                    icon: 'html5'
                },
                {
                    title: 'Custom Renderers',
                    href: '/docs/renderers/custom-renderers',
                    icon: 'paintbrush'
                },
                {
                    title: 'Snippet Overrides',
                    href: '/docs/renderers/snippet-overrides',
                    icon: 'scissors'
                }
            ]
        },
        {
            title: 'Advanced',
            icon: 'settings',
            items: [
                {
                    title: 'Token Caching',
                    href: '/docs/advanced/token-caching',
                    icon: 'zap'
                },
                {
                    title: 'Allow/Deny',
                    href: '/docs/advanced/allow-deny',
                    icon: 'shield'
                },
                {
                    title: 'Security',
                    href: '/docs/advanced/security',
                    icon: 'lock'
                },
                {
                    title: 'Marked Extensions',
                    href: '/docs/advanced/marked-extensions',
                    icon: 'puzzle'
                }
            ]
        },
        {
            title: 'Examples',
            icon: 'code',
            items: [
                {
                    title: 'Overview',
                    href: '/docs/examples',
                    icon: 'code'
                },
                {
                    title: 'Basic Rendering',
                    href: '/docs/examples/basic-rendering',
                    icon: 'file-text'
                },
                {
                    title: 'Custom Renderers',
                    href: '/docs/examples/custom-renderers',
                    icon: 'paintbrush'
                },
                {
                    title: 'Snippet Overrides',
                    href: '/docs/examples/snippet-overrides',
                    icon: 'scissors'
                },
                {
                    title: 'HTML Filtering',
                    href: '/docs/examples/html-filtering',
                    icon: 'filter'
                },
                {
                    title: 'Inline Rendering',
                    href: '/docs/examples/inline-rendering',
                    icon: 'text-cursor'
                },
                {
                    title: 'Parsed Callback',
                    href: '/docs/examples/parsed-callback',
                    icon: 'workflow'
                },
                {
                    title: 'Linked Headings',
                    href: '/docs/examples/linked-headings',
                    icon: 'link'
                }
            ]
        },
        {
            title: 'Interactive Demos',
            icon: 'play',
            items: [
                {
                    title: 'All Examples',
                    href: '/examples',
                    icon: 'play'
                },
                {
                    title: 'Live Playground',
                    href: '/examples/playground',
                    icon: 'square-pen'
                },
                {
                    title: 'Custom Renderers',
                    href: '/examples/custom-renderers',
                    icon: 'paintbrush'
                },
                {
                    title: 'Snippet Overrides',
                    href: '/examples/snippet-overrides',
                    icon: 'scissors'
                },
                {
                    title: 'HTML Filtering',
                    href: '/examples/html-filtering',
                    icon: 'filter'
                },
                {
                    title: 'Caching Performance',
                    href: '/examples/caching-performance',
                    icon: 'gauge'
                },
                {
                    title: 'Marked Extensions',
                    href: '/examples/marked-extensions',
                    icon: 'puzzle'
                },
                {
                    title: 'Mermaid Diagrams',
                    href: '/examples/mermaid',
                    icon: 'workflow'
                },
                {
                    title: 'GitHub Alerts',
                    href: '/examples/github-alerts',
                    icon: 'triangle-alert'
                },
                {
                    title: 'Footnotes',
                    href: '/examples/footnotes',
                    icon: 'superscript'
                },
                {
                    title: 'Code Formatting',
                    href: '/examples/code-formatting',
                    icon: 'code'
                },
                {
                    title: 'Linked Headings',
                    href: '/examples/linked-headings',
                    icon: 'link'
                }
            ]
        },
        {
            title: 'Love and Respect',
            icon: 'heart',
            items: [
                {
                    title: 'Beye.ai',
                    href: 'https://beye.ai',
                    icon: 'heart',
                    external: true
                }
            ]
        },
        ...(otherProjects.length > 0
            ? [
                  {
                      title: 'Other Projects',
                      icon: 'box' as IconName,
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
                            <Icon name={section.icon} class="text-muted-foreground size-3.5" />
                        </motion.span>
                        {section.title}
                    </span>
                    <ChevronDown
                        class="text-muted-foreground size-3 shrink-0 transition-transform duration-200 {isSectionOpen(
                            section
                        )
                            ? 'rotate-180'
                            : ''}"
                    />
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
                                            <Icon
                                                name={item.icon}
                                                class="size-3.5 {isActive(item.href)
                                                    ? 'text-accent-foreground'
                                                    : 'text-muted-foreground group-hover:text-foreground'}"
                                            />
                                        </motion.span>
                                    {:else}
                                        <ArrowRight class="text-muted-foreground mr-3 size-3" />
                                    {/if}
                                    {item.title}
                                    {#if item?.external}
                                        <ExternalLink class="ml-2 size-3 opacity-50" />
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
