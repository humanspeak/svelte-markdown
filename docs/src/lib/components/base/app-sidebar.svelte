<script lang="ts">
    import { mode } from 'mode-watcher'
    import * as Sidebar from '$lib/shadcn/components/ui/sidebar/index.js'
</script>

<Sidebar.Root>
    <Sidebar.Content>
        <Sidebar.Header>
            <div class="flex flex-col">
                <div class="flex w-full gap-2">
                    {#if $mode === 'dark'}
                        <img src="./Humanspeak-bubble-dark.svg" alt="humanspeak logo" class="h-5" />
                    {:else}
                        <img src="./Humanspeak-bubble.svg" alt="humanspeak logo" class="h-5" />
                    {/if}
                    <span>/markdown</span>
                </div>
            </div>
        </Sidebar.Header>
    </Sidebar.Content><Sidebar.Footer class="flex flex-col">
        <Sidebar.GroupContent>
            <Sidebar.Menu>
                <Sidebar.MenuItem>
                    <Sidebar.MenuButton>
                        <a href={'https://humanspeak.com'}>
                            <i class="fa-solid fa-house-heart"></i>
                            <span>Humanspeak</span>
                        </a>
                    </Sidebar.MenuButton>
                    <Sidebar.MenuButton>
                        <a href={'https://shadcn-svelte.com'}>
                            <i class="fa-solid fa-house-heart"></i>
                            <span>Shadcn</span>
                        </a>
                    </Sidebar.MenuButton>
                    <Sidebar.MenuButton>
                        <a href={'https://github.com/pablo-abc'}>
                            <i class="fa-solid fa-house-heart"></i>
                            <span>Svelte 4 Version</span>
                        </a>
                    </Sidebar.MenuButton>
                </Sidebar.MenuItem>
            </Sidebar.Menu>
        </Sidebar.GroupContent>
    </Sidebar.Footer>
</Sidebar.Root>
