<script lang="ts">
    import type { Snippet } from 'svelte'

    type ExampleProps = {
        children: Snippet
        title?: string
        sourceUrl?: string | null
    }

    const { children, title, sourceUrl }: ExampleProps = $props()

    let refreshKey = $state(0)
    const refresh = () => {
        refreshKey++
    }
</script>

{#if title}
    <h1 class="sr-only">{title}</h1>
{/if}

<div class="isolate flex h-full w-full flex-1 flex-col">
    <!-- Toolbar -->
    <div class="border-border bg-card/50 flex h-12 w-full items-center border-b px-4">
        <div class="flex flex-1 items-center gap-2">
            <a
                href="/examples"
                class="border-border text-muted-foreground hover:border-brand-500/50 hover:text-foreground inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors"
            >
                <i class="fa-solid fa-grid-2 text-xs"></i>
                Examples
            </a>
            {#if title}
                <span class="text-muted-foreground">/</span>
                <span class="text-foreground text-sm font-medium">{title}</span>
            {/if}
        </div>
        <div class="flex items-center gap-2">
            {#if sourceUrl}
                <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="border-border text-muted-foreground hover:border-brand-500/50 hover:text-foreground inline-flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm transition-colors"
                >
                    <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i>
                    Source
                </a>
            {/if}
            <button
                onclick={refresh}
                class="border-border text-muted-foreground hover:border-brand-500/50 hover:text-foreground inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors"
                title="Reset example"
            >
                <i class="fa-solid fa-rotate-right text-xs"></i>
            </button>
        </div>
    </div>

    <!-- Dotted grid background -->
    <div class="bg-grid-brand pointer-events-none fixed inset-0 top-12 bottom-16 z-0"></div>

    <!-- Content area -->
    <div class="relative z-10 flex flex-1 items-center justify-center p-8">
        {#key refreshKey}
            {@render children()}
        {/key}
    </div>
</div>

<style>
    .bg-grid-brand {
        background-image:
            radial-gradient(
                color-mix(in srgb, var(--color-brand-600) 20%, transparent) 1.5px,
                transparent 1.5px
            ),
            radial-gradient(
                color-mix(in srgb, var(--color-brand-600) 10%, transparent) 1.5px,
                transparent 1.5px
            );
        background-position:
            0 0,
            12px 12px;
        background-size: 24px 24px;
        mask-image: linear-gradient(
            to top,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 10%,
            rgba(0, 0, 0, 0) 30%
        );
        -webkit-mask-image: linear-gradient(
            to top,
            rgba(0, 0, 0, 1) 0%,
            rgba(0, 0, 0, 0.8) 10%,
            rgba(0, 0, 0, 0) 30%
        );
    }

    :global(.dark) .bg-grid-brand {
        background-image:
            radial-gradient(
                color-mix(in srgb, var(--color-brand-500) 18%, transparent) 1.5px,
                transparent 1.5px
            ),
            radial-gradient(
                color-mix(in srgb, var(--color-brand-500) 10%, transparent) 1.5px,
                transparent 1.5px
            );
    }
</style>
