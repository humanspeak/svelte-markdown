<script lang="ts">
    import { motion } from '@humanspeak/svelte-motion'
    import favicon from '$lib/assets/logo.svg'
    import { resolve } from '$app/paths'
    // Local minimal cn helper to combine class names
    const cn = (...classes: Array<string | false | null | undefined>) =>
        classes.filter(Boolean).join(' ')
    import { type BreadcrumbContext } from '$lib/components/contexts/Breadcrumb/type'
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { mode, setMode } from 'mode-watcher'

    // Try to get breadcrumb context (may not exist on all pages)
    let breadcrumbContext = $state<BreadcrumbContext | undefined>(getBreadcrumbContext())
    try {
        breadcrumbContext = getBreadcrumbContext()
    } catch {
        // No breadcrumb context available
    }

    const changeMode = () => {
        if (mode.current === 'dark') {
            setMode('light')
        } else {
            setMode('dark')
        }
    }

    const breadcrumbs = $derived(breadcrumbContext?.breadcrumbs ?? [])
</script>

<div>
    <header
        class="border-border bg-background text-foreground flex items-center justify-between border-b px-6 py-4"
    >
        <div class="flex items-center gap-2">
            <a
                href={resolve('/')}
                aria-label="Home"
                class="inline-flex items-center justify-center"
            >
                <motion.img
                    src={favicon}
                    alt="logo"
                    class="h-6 w-6 rounded-md "
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.1 }}
                />
            </a>
            {#if breadcrumbContext && breadcrumbs.length > 0}
                <nav aria-label="Breadcrumb">
                    <ol class="flex items-center space-x-2 text-sm">
                        <!-- Dynamic breadcrumbs -->
                        {#each breadcrumbs as crumb, index (index)}
                            <li>
                                <i class="fa-solid fa-chevron-right text-muted-foreground text-xs"
                                ></i>
                            </li>
                            <li class="flex items-center">
                                {#if index === breadcrumbs.length - 1 || !crumb.href}
                                    <!-- Current page (not a link) -->
                                    <span
                                        class={cn(
                                            'text-foreground',
                                            crumb.href ? 'text-muted-foreground' : 'font-medium'
                                        )}
                                        aria-current="page"
                                    >
                                        {crumb.title}
                                    </span>
                                {:else}
                                    <!-- Intermediate breadcrumb (link) -->
                                    <a
                                        href={crumb.href}
                                        class="text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        {crumb.title}
                                    </a>
                                {/if}
                            </li>
                        {/each}
                    </ol>
                </nav>
            {/if}
        </div>
        <div class="flex items-center gap-4">
            <motion.button
                onclick={changeMode}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.1 }}
                class="border-border-muted text-text-muted hover:border-border-mid hover:text-text-secondary inline-flex size-6 items-center justify-center rounded-full border transition-colors"
            >
                {#if mode.current === 'dark'}
                    <i class="fa-sm fa-solid fa-sun transition-all"></i>
                {:else}
                    <i class="fa-sm fa-solid fa-moon absolute transition-all"></i>
                {/if}
            </motion.button>

            <a
                href="https://github.com/humanspeak/memory-cache"
                target="_blank"
                rel="noopener noreferrer"
                class="text-text-muted hover:text-text-secondary inline-flex items-center justify-center"
                aria-label="GitHub"
            >
                <motion.div
                    class="border-border-muted hover:border-border-mid inline-flex size-6 items-center justify-center rounded-full border transition-colors"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                >
                    <i class="fa-brands fa-github fa-sm"></i>
                </motion.div>
            </a>
            <a
                href="https://www.npmjs.com/package/@humanspeak/memory-cache"
                target="_blank"
                rel="noopener noreferrer"
                class="text-text-muted hover:text-text-secondary inline-flex items-center justify-center"
                aria-label="NPM"
            >
                <motion.div
                    class="border-border-muted hover:border-border-mid inline-flex size-6 items-center justify-center rounded-full border transition-colors"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                >
                    <i class="fa-brands fa-npm fa-sm"></i>
                </motion.div>
            </a>
        </div>
    </header>
</div>
