<script lang="ts">
    import { page } from '$app/state'

    const dimensions = {
        og: { width: 1200, height: 630, name: 'OpenGraph Card' },
        twitter: { width: 1200, height: 600, name: 'Twitter Card' }
    }

    const cardType = $derived(page.url.searchParams.get('type') || 'og')
    const activeDimensions = $derived(dimensions[cardType as keyof typeof dimensions])

    const features = ['Custom Renderers', 'HTML Parsing', 'TypeScript Support', 'GitHub Slugs']
</script>

<div
    id="social-card"
    class="relative overflow-hidden bg-[radial-gradient(circle_at_95%_95%,_#FF3E00_0%,_#54DBBC_40%,_#4AE3B6_70%,_#40D1A7_100%)] p-16 text-white"
    style:width="{activeDimensions.width}px"
    style:height="{activeDimensions.height}px"
>
    <div class="absolute inset-0 bg-black/5 backdrop-blur-[1px]"></div>

    <div class="relative z-10 flex h-full flex-col justify-between">
        <!-- Header Section -->
        <div class="space-y-8">
            <div class="text-lg font-medium uppercase tracking-wider text-white/80">
                {cardType === 'og'
                    ? 'High Performance Markdown Parser'
                    : 'Markdown Parser Component'}
            </div>
            <h1
                class:text-8xl={cardType === 'og'}
                class:text-7xl={cardType === 'twitter'}
                class="font-bold leading-tight tracking-tight"
            >
                Svelte Markdown
            </h1>
            <p
                class:text-4xl={cardType === 'og'}
                class:text-3xl={cardType === 'twitter'}
                class="max-w-3xl font-medium leading-relaxed text-white/90"
            >
                Transform markdown into customizable Svelte components
            </p>
        </div>

        <!-- Features Section -->
        <div class="flex flex-col justify-between space-y-12">
            <!-- Feature Pills -->
            <div class="flex flex-wrap gap-4">
                {#each features as feature}
                    <div
                        class="rounded-full bg-white/10 px-6 py-2 text-lg font-medium backdrop-blur-sm"
                    >
                        {feature}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Bottom Bar -->
        <div class="flex w-full items-end justify-between">
            <div
                class="flex items-center gap-1 rounded-full bg-white/10 px-6 py-3 backdrop-blur-sm"
            >
                <img src="/humanspeak-bubble.svg" alt="Logo" class="h-8" />
                <span class="text-xl font-medium">by Humanspeak</span>
            </div>
            <div
                class="flex items-center gap-1 rounded-full bg-white/10 px-6 py-3 backdrop-blur-sm"
                style="margin-right: -32px;"
            >
                <img src="./svelte-logo.svg" alt="Svelte" class="h-8" />
                <span class="text-xl font-medium">Built for Svelte 5</span>
            </div>
        </div>
    </div>
</div>

<!-- Preview Controls -->
<div class="fixed right-4 top-4 flex gap-4 rounded-lg bg-white p-4 shadow-lg">
    <a
        href="?type=og"
        class="rounded-md px-4 py-2 transition-colors"
        class:bg-violet-500={cardType === 'og'}
        class:text-white={cardType === 'og'}
        class:bg-gray-100={cardType !== 'og'}
        class:hover:bg-gray-200={cardType !== 'og'}
    >
        OpenGraph
    </a>
    <a
        href="?type=twitter"
        class="rounded-md px-4 py-2 transition-colors"
        class:bg-violet-500={cardType === 'twitter'}
        class:text-white={cardType === 'twitter'}
        class:bg-gray-100={cardType !== 'twitter'}
        class:hover:bg-gray-200={cardType !== 'twitter'}
    >
        Twitter
    </a>
</div>

<style>
    :global(body) {
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        margin: 0;
        background: #f0f0f0;
    }
</style>
