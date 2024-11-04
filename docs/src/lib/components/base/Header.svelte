<script lang="ts">
    import { Button } from '$lib/shadcn/components/ui/button'
</script>

<div class="grid grid-cols-3 items-center">
    <div>&nbsp;</div>
    <!-- Empty left column -->
    <h1 class="text-center text-4xl font-extrabold">@humanspeak/svelte-markdown</h1>
    <div class="flex justify-end">
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
