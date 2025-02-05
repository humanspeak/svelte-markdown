<script lang="ts">
    import { resetMode, setMode, userPrefersMode } from 'mode-watcher'
    import { buttonVariants } from '$lib/shadcn/components/ui/button/'
    import * as DropdownMenu from '$lib/shadcn/components/ui/dropdown-menu/index.js'
    import * as Tooltip from '$lib/shadcn/components/ui/tooltip/index.js'
</script>

<DropdownMenu.Root>
    <DropdownMenu.Trigger>
        <Tooltip.Root>
            <Tooltip.Trigger class={buttonVariants({ variant: 'ghost', size: 'icon' })}>
                <i
                    class="fa-solid fa-sun-bright fa-fw scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
                ></i>
                <i
                    class="fa-solid fa-moon fa-fw absolute scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
                ></i>
                <span class="sr-only">Toggle theme</span>
            </Tooltip.Trigger>
            <Tooltip.Content side="top" class="flex items-center gap-4">Themes</Tooltip.Content>
        </Tooltip.Root>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content align="end">
        <DropdownMenu.RadioGroup bind:value={$userPrefersMode}>
            <DropdownMenu.RadioItem value="light" onclick={() => setMode('light')}>
                Light
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="dark" onclick={() => setMode('dark')}>
                Dark
            </DropdownMenu.RadioItem>
            <DropdownMenu.RadioItem value="system" onclick={() => resetMode()}>
                System
            </DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
    </DropdownMenu.Content>
</DropdownMenu.Root>
