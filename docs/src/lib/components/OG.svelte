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

    const features = ['Svelte 5 Runes', 'TypeScript First', '50-200x Caching', 'Marked Extensions']
</script>

<div
    id="social-card"
    class="relative flex flex-col overflow-hidden bg-[#0A0A0A] p-16 text-white"
    style:width="{activeDimensions.width}px"
    style:height="{activeDimensions.height}px"
>
    <!-- Beautiful Ambient Glowing Orbs -->
    <div
        class="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#ff3e00] opacity-30 blur-[128px]"
    ></div>
    <div
        class="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#00D8FF] opacity-15 blur-[128px]"
    ></div>

    <!-- Subtle Grid Background -->
    <div
        class="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"
    ></div>

    <div class="relative z-10 flex h-full flex-col justify-between">
        <!-- Header Section -->
        <div class="flex flex-col space-y-6">
            <!-- Top pill / Breadcrumb -->
            <div
                class="flex w-fit items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold tracking-wide text-white/80 uppercase backdrop-blur-md"
            >
                <img src="{url}/humanspeak-dark.svg" alt="Humanspeak" class="h-4 w-4 opacity-80" />
                <span>@humanspeak/svelte-markdown</span>
            </div>

            <h1
                class:text-8xl={type === 'og'}
                class:text-7xl={type === 'twitter'}
                class="leading-tight font-extrabold tracking-tighter"
            >
                Svelte Markdown
            </h1>
            <p
                class:text-4xl={type === 'og'}
                class:text-3xl={type === 'twitter'}
                class="max-w-3xl leading-snug font-medium text-white/70"
            >
                Fast, secure markdown rendering with built-in caching and snippet overrides.
            </p>
        </div>

        <!-- Features Section -->
        <div class="flex flex-col justify-between space-y-12">
            <div class="flex flex-wrap gap-4">
                {#each features as feature}
                    <div
                        class="flex items-center space-x-3 rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-xl font-medium text-white/90 shadow-xl backdrop-blur-md"
                    >
                        <div
                            class="h-2.5 w-2.5 rounded-full bg-[#ff3e00] shadow-[0_0_8px_#ff3e00]"
                        ></div>
                        <span>{feature}</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- Bottom Bar -->
        <div class="flex w-full items-end justify-between">
            <div class="flex items-center space-x-6">
                <!-- Authorship -->
                <div class="flex items-center space-x-4">
                    <img src="{url}/humanspeak-dark.svg" alt="Logo" class="h-12 w-12 opacity-90" />
                    <div class="flex flex-col">
                        <span class="text-sm font-semibold tracking-wider text-white/50 uppercase"
                            >Created by</span
                        >
                        <span class="text-2xl font-bold tracking-tight">Humanspeak</span>
                    </div>
                </div>
            </div>

            <!-- Svelte Badge -->
            <div
                class="flex items-center space-x-4 rounded-2xl border border-white/10 bg-white/5 p-4 pr-6 shadow-xl backdrop-blur-md"
            >
                <img src="{url}/svelte-logo.svg" alt="Svelte" class="h-12 w-12" />
                <div class="flex flex-col">
                    <span class="text-xs font-semibold tracking-wider text-[#ff3e00] uppercase"
                        >Built for</span
                    >
                    <span class="text-xl font-bold tracking-tight">Svelte 5 Runes</span>
                </div>
            </div>
        </div>
    </div>
</div>
