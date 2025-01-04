<script lang="ts">
    import { mode } from 'mode-watcher'
    import * as Sidebar from '$lib/shadcn/components/ui/sidebar/index.js'
    import * as Collapsible from '$lib/shadcn/components/ui/collapsible/index.js'
    import { fade } from 'svelte/transition'
</script>

<Sidebar.Root>
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton size="lg">
                    {#snippet child({ props }: { props: any })}
                        <a href="##" {...props}>
                            <div class="flex w-full gap-2">
                                {#if $mode === 'dark'}
                                    <img
                                        src="./Humanspeak-bubble-dark.svg"
                                        alt="humanspeak logo"
                                        class="h-5"
                                    />
                                {:else}
                                    <img
                                        src="./Humanspeak-bubble.svg"
                                        alt="humanspeak logo"
                                        class="h-5"
                                    />
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
                            {#snippet child({ props }: { props: any })}
                                <Sidebar.MenuButton {...props}>
                                    Components{' '}
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
                                        <a href={'https://virtuallist.svelte.page'}>
                                            <span>/virtual-list</span>
                                        </a>
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
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
                            {#snippet child({ props }: { props: any })}
                                <Sidebar.MenuButton {...props}>
                                    Love & Respect{' '}

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
                                        <a href={'https://humanspeak.com'} target="_blank">
                                            <span>Humanspeak</span>
                                        </a>
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
                                <Sidebar.MenuSubItem>
                                    <Sidebar.MenuButton>
                                        <a href={'https://beye.ai'} target="_blank">
                                            <span>B/eye</span>
                                        </a>
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
                                <Sidebar.MenuSubItem>
                                    <Sidebar.MenuButton>
                                        <a href={'https://shadcn-svelte.com'} target="_blank">
                                            <span>Shadcn</span>
                                        </a>
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuSubItem>
                                <Sidebar.MenuSubItem>
                                    <Sidebar.MenuButton>
                                        <a
                                            href={'https://github.com/pablo-abc/svelte-markdown'}
                                            target="_blank"
                                        >
                                            <span>Svelte 4 Version</span>
                                        </a>
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
