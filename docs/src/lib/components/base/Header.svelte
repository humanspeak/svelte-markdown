<script lang="ts">
    import { Button } from '$lib/shadcn/components/ui/button'
    import { mode } from 'mode-watcher'
    import ModeChanger from './ModeChanger.svelte'
</script>

<div class="grid grid-cols-3 items-center">
    <div>&nbsp;</div>
    <!-- Empty left column -->
    <h1 class="text-center text-4xl font-extrabold">
        <div class="flex w-full items-center justify-center gap-2">
            {#if $mode === 'dark'}
                <img src="./Humanspeak-bubble-dark.svg" alt="humanspeak logo" class="h-10" />
            {:else}
                <img src="./Humanspeak-bubble.svg" alt="humanspeak logo" class="h-10" />
            {/if}
            <span>/svelte-markdown</span>
        </div>
    </h1>
    <div class="flex justify-end">
        <ModeChanger />
        <Button
            variant="ghost"
            size="icon"
            href="https://github.com/humanspeak/svelte-markdown"
            target="_blank"
        >
            <i class="fa-brands fa-github text-xl"></i>
        </Button>
        <Button
            variant="ghost"
            size="icon"
            href="https://www.npmjs.com/package/@humanspeak/svelte-markdown"
            target="_blank"
        >
            <i class="fa-brands fa-npm text-xl"></i>
        </Button>
    </div>
</div>
