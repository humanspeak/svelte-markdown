<script lang="ts">
    import { mode } from 'mode-watcher'
    import * as Sidebar from '$lib/shadcn/components/ui/sidebar/index.js'
    import * as Collapsible from '$lib/shadcn/components/ui/collapsible/index.js'
    import { fade } from 'svelte/transition'
    import { onMount } from 'svelte'

    interface SvelteComponent {
        url: string
        shortDescription: string
        longDescription: string
        slug?: string // Will be added in future API version
    }

    let components = $state<SvelteComponent[]>([])
    let loading = $state(true)

    // Helper to extract slug from URL until API provides it
    function getSlugFromUrl(url: string): string {
        const domain = new URL(url).hostname
        const name = domain.split('.')[0] // e.g., "virtuallist" from "virtuallist.svelte.page"

        // Convert to kebab-case with slash prefix
        const slug = name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

        return `/${slug}`
    }

    onMount(async () => {
        try {
            // Fetch from our own API route to avoid CORS
            const response = await fetch('/api/components')
            components = await response.json<SvelteComponent[]>()
        } catch (error) {
            console.error('Failed to fetch components:', error)
        } finally {
            loading = false
        }
    })
</script>

<Sidebar.Root>
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton size="lg">
                    {#snippet child({ props }: { props: Record<string, unknown> })}
                        <a href="##" {...props}>
                            <div class="flex w-full gap-2">
                                {#if mode.current === 'dark'}
                                    <img
                                        src="./humanspeak-dark.svg"
                                        alt="humanspeak logo"
                                        class="h-5"
                                    />
                                {:else}
                                    <img src="./humanspeak.svg" alt="humanspeak logo" class="h-5" />
                                {/if}
                                <span>/markdown</span>
                            </div>
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>
    <Sidebar.Content class="flex flex-col">
        <Sidebar.Group>
            <Sidebar.Menu>
                <Collapsible.Root open class="group/collapsible">
                    <Sidebar.MenuItem>
                        <Collapsible.Trigger>
                            {#snippet child({ props }: { props: Record<string, unknown> })}
                                <Sidebar.MenuButton {...props}>
                                    Components
                                    <span in:fade={{ duration: 500 }} class="ml-auto">
                                        {#if props['data-state'] === 'open'}
                                            <i class="fa-solid fa-plus fa-fw"></i>
                                        {:else}
                                            <i class="fa-solid fa-minus fa-fw"></i>
                                        {/if}
                                    </span>
                                </Sidebar.MenuButton>
                            {/snippet}
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <Sidebar.MenuSub>
                                {#if loading}
                                    <Sidebar.MenuSubItem>
                                        <Sidebar.MenuButton>
                                            <span class="text-muted-foreground">Loading...</span>
                                        </Sidebar.MenuButton>
                                    </Sidebar.MenuSubItem>
                                {:else}
                                    {#each components as component (component.url)}
                                        <Sidebar.MenuSubItem>
                                            <Sidebar.MenuButton>
                                                {#snippet child({
                                                    props
                                                }: {
                                                    props: Record<string, unknown>
                                                })}
                                                    <a
                                                        href={component.url}
                                                        title={component.shortDescription}
                                                        {...props}
                                                    >
                                                        <span
                                                            >{component.slug ||
                                                                getSlugFromUrl(component.url)}</span
                                                        >
                                                    </a>
                                                {/snippet}
                                            </Sidebar.MenuButton>
                                        </Sidebar.MenuSubItem>
                                    {/each}
                                {/if}
                            </Sidebar.MenuSub>
                        </Collapsible.Content>
                    </Sidebar.MenuItem>
                </Collapsible.Root>
            </Sidebar.Menu>
        </Sidebar.Group>
    </Sidebar.Content>
    <Sidebar.Footer class="flex flex-col">
        <Sidebar.Group>
            <Sidebar.Menu>
                <Collapsible.Root open class="group/collapsible">
                    <Sidebar.MenuItem>
                        <Collapsible.Trigger>
                            {#snippet child({ props }: { props: Record<string, unknown> })}
                                <Sidebar.MenuButton {...props}>
                                    Love & Respect
                                    <span in:fade={{ duration: 500 }} class="ml-auto">
                                        {#if props['data-state'] === 'open'}
                                            <i class="fa-solid fa-plus fa-fw"></i>
                                        {:else}
                                            <i class="fa-solid fa-minus fa-fw"></i>
                                        {/if}
                                    </span>
                                </Sidebar.MenuButton>
                            {/snippet}
                        </Collapsible.Trigger>
                        <Collapsible.Content>
                            <Sidebar.MenuSub>
                                <Sidebar.MenuSubItem>
                                    <Sidebar.MenuButton>
                                        {#snippet child({
                                            props
                                        }: {
                                            props: Record<string, unknown>
                                        })}
                                            <a
                                                href="https://humanspeak.com"
                                                target="_blank"
                                                {...props}
                                            >
                                                <span>Humanspeak</span>
                                            </a>
                                        {/snippet}
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
                                <Sidebar.MenuSubItem>
                                    <Sidebar.MenuButton>
                                        {#snippet child({
                                            props
                                        }: {
                                            props: Record<string, unknown>
                                        })}
                                            <a href="https://beye.ai" target="_blank" {...props}>
                                                <span>B/eye</span>
                                            </a>
                                        {/snippet}
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
                                <Sidebar.MenuSubItem>
                                    <Sidebar.MenuButton>
                                        {#snippet child({
                                            props
                                        }: {
                                            props: Record<string, unknown>
                                        })}
                                            <a
                                                href="https://shadcn-svelte.com"
                                                target="_blank"
                                                {...props}
                                            >
                                                <span>Shadcn</span>
                                            </a>
                                        {/snippet}
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
                                <Sidebar.MenuSubItem>
                                    <Sidebar.MenuButton>
                                        {#snippet child({
                                            props
                                        }: {
                                            props: Record<string, unknown>
                                        })}
                                            <a
                                                href="https://github.com/pablo-abc/svelte-markdown"
                                                target="_blank"
                                                {...props}
                                            >
                                                <span>Svelte 4 Version</span>
                                            </a>
                                        {/snippet}
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
                            </Sidebar.MenuSub>
                        </Collapsible.Content>
                    </Sidebar.MenuItem>
                </Collapsible.Root>
            </Sidebar.Menu>
        </Sidebar.Group>
    </Sidebar.Footer>
</Sidebar.Root>
