<script lang="ts">
    const {
        type = 'og',
        url
    }: {
        type: 'og' | 'twitter'
        url: string
    } = $props()

    const dimensions = {
        og: { width: 1200, height: 630, name: 'OpenGraph Card' },
        twitter: { width: 1200, height: 600, name: 'Twitter Card' }
    }

    const activeDimensions = $derived(dimensions[type])

    const features = [
        'Dynamic Heights',
        'Bidirectional Scrolling',
        'TypeScript Support',
        '5kb Gzipped'
    ]
</script>

<div
    id="social-card"
    class="relative flex flex-col overflow-hidden p-16 text-white"
    style:width="{activeDimensions.width}px"
    style:height="{activeDimensions.height}px"
    style="background: radial-gradient(circle at 95% 95%, #FF3E00 0%, #54DBBC 40%, #4AE3B6 70%, #40D1A7 100%);"
>
    <div class="absolute inset-0 flex bg-black/5 backdrop-blur-[1px]"></div>
    <div class="relative flex h-full flex-col justify-between">
        <!-- Header Section -->
        <div class="flex flex-col space-y-8">
            <div
                class="flex flex-shrink-0 text-lg font-medium tracking-wider text-white/80 uppercase"
            >
                {type === 'og' ? 'High Performance Markdown Parser' : 'Markdown Parser Component'}
            </div>
            <h1
                class:text-8xl={type === 'og'}
                class:text-7xl={type === 'twitter'}
                class="leading-tight font-bold tracking-tight"
            >
                Svelte Markdown
            </h1>
            <p
                class:text-4xl={type === 'og'}
                class:text-3xl={type === 'twitter'}
                class="max-w-3xl leading-relaxed font-medium text-white/90"
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
                        class="flex flex-shrink-0 rounded-full bg-white/10 px-6 py-2 text-lg font-medium backdrop-blur-sm"
                    >
                        {feature}
                    </div>
                {/each}
            </div>
        </div>

        <!-- Bottom Bar -->
        <div class="flex w-full items-end justify-between">
            <div
                class="flex flex-shrink-0 items-center rounded-full bg-white/10 px-6 py-3 backdrop-blur-sm"
            >
                <img src="{url}/humanspeak.svg" alt="Logo" class="mr-2 h-8" />
                <span class="text-xl font-medium">by Humanspeak</span>
            </div>
            <div class="flex items-center rounded-full bg-white/10 px-6 py-3 backdrop-blur-sm">
                <img src="{url}/svelte-logo.svg" alt="Svelte" class="mr-2 h-8" />
                <span class="text-xl font-medium">Built for Svelte 5</span>
            </div>
        </div>
    </div>
</div>
