<script lang="ts">
    const {
        type = 'og',
        url,
        title,
        description,
        features
    }: {
        type: 'og' | 'twitter'
        url: string
        title?: string
        description?: string
        features?: string[]
    } = $props()

    const dimensions = {
        og: { width: 1200, height: 630, name: 'OpenGraph Card' },
        twitter: { width: 1200, height: 600, name: 'Twitter Card' }
    }

    const activeDimensions = $derived(dimensions[type])

    const displayFeatures = $derived(
        features?.slice(0, 4) || [
            'Svelte 5 Runes',
            'TypeScript First',
            '50-200x Caching',
            'Marked Extensions'
        ]
    )
    const displayTitle = $derived(title || 'Svelte Markdown')
    const displayDescription = $derived(
        description ||
            'Fast, secure markdown rendering with built-in caching and snippet overrides.'
    )

    const titleFontSize = $derived(type === 'og' ? '6rem' : '4.5rem')
    const descFontSize = $derived(type === 'og' ? '2.25rem' : '1.875rem')
</script>

<div
    id="social-card"
    class="relative flex flex-col overflow-hidden bg-[#0A0A0A] p-16 text-white"
    style="display: flex; flex-direction: column; position: relative; overflow: hidden; background-color: #0a0a0a; padding: 4rem; color: #ffffff; width: {activeDimensions.width}px; height: {activeDimensions.height}px; font-family: 'lato';"
>
    <!-- Ambient Glowing Orbs (radial-gradient for satori compatibility — no filter:blur) -->
    <div
        class="absolute -top-40 -right-40 h-[40rem] w-[40rem] rounded-full opacity-30"
        style="display: flex; position: absolute; top: -10rem; right: -10rem; height: 40rem; width: 40rem; border-radius: 9999px; background-image: radial-gradient(circle, rgba(255, 62, 0, 1) 0%, rgba(255, 62, 0, 0) 70%); opacity: 0.3;"
    ></div>
    <div
        class="absolute -bottom-40 -left-40 h-[700px] w-[700px] rounded-full opacity-15"
        style="display: flex; position: absolute; bottom: -10rem; left: -10rem; height: 700px; width: 700px; border-radius: 9999px; background-image: radial-gradient(circle, rgba(0, 216, 255, 1) 0%, rgba(0, 216, 255, 0) 70%); opacity: 0.15;"
    ></div>

    <!-- Subtle Grid Background -->
    <div
        class="absolute inset-0"
        style="display: flex; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-image: linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px); background-size: 24px 24px;"
    ></div>

    <div
        class="relative flex h-full flex-col justify-between"
        style="display: flex; position: relative; height: 100%; flex-direction: column; justify-content: space-between;"
    >
        <!-- Header: Pill + Title + Description -->
        <div class="flex flex-col" style="display: flex; flex-direction: column; gap: 0.75rem;">
            <!-- Top pill / Breadcrumb -->
            <div
                class="flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold tracking-wide text-white/80 uppercase"
                style="display: flex; align-items: center; align-self: flex-start; gap: 0.5rem; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(255, 255, 255, 0.05); padding: 0.5rem 1rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; letter-spacing: 0.025em; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; font-family: 'lato';"
            >
                <img
                    src="{url}/humanspeak-dark.svg"
                    alt="Humanspeak"
                    class="h-4 w-4 opacity-80"
                    style="height: 1rem; width: 1rem; opacity: 0.8;"
                />
                <span>@humanspeak/svelte-markdown</span>
            </div>

            <h1
                class:text-8xl={type === 'og'}
                class:text-7xl={type === 'twitter'}
                class="leading-tight font-extrabold tracking-tighter"
                style="margin: 0; font-size: {titleFontSize}; line-height: 1.1; font-weight: 800; letter-spacing: -0.05em; font-family: 'lato-extrabold';"
            >
                {displayTitle}
            </h1>

            <p
                class:text-4xl={type === 'og'}
                class:text-3xl={type === 'twitter'}
                class="max-w-5xl leading-snug font-medium text-white/70"
                style="margin: 0; font-size: {descFontSize}; line-height: 1.375; max-width: 64rem; font-weight: 500; color: rgba(255, 255, 255, 0.7); font-family: 'lato';"
            >
                {displayDescription}
            </p>
        </div>

        <!-- Features Section -->
        <div class="flex flex-wrap" style="display: flex; flex-wrap: wrap; gap: 1rem;">
            {#each displayFeatures as feature}
                <div
                    class="flex items-center rounded-xl border border-white/10 bg-white/5 px-6 py-4 text-xl font-medium text-white/90 shadow-xl"
                    style="display: flex; align-items: center; gap: 0.75rem; border-radius: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(255, 255, 255, 0.05); padding: 1rem 1.5rem; font-size: 1.25rem; line-height: 1.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.9); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); font-family: 'lato';"
                >
                    <div
                        class="h-2.5 w-2.5 rounded-full bg-[#ff3e00]"
                        style="display: flex; height: 0.625rem; width: 0.625rem; border-radius: 9999px; background-color: #ff3e00; box-shadow: 0 0 8px #ff3e00;"
                    ></div>
                    <span>{feature}</span>
                </div>
            {/each}
        </div>

        <!-- Bottom Bar -->
        <div
            class="flex w-full items-center justify-between"
            style="display: flex; width: 100%; align-items: center; justify-content: space-between;"
        >
            <div class="flex items-center" style="display: flex; align-items: center; gap: 1.5rem;">
                <!-- Authorship -->
                <div
                    class="flex items-center"
                    style="display: flex; align-items: center; gap: 1rem;"
                >
                    <img
                        src="{url}/humanspeak-dark.svg"
                        alt="Logo"
                        class="h-12 w-12 opacity-90"
                        style="height: 3rem; width: 3rem; opacity: 0.9;"
                    />
                    <div class="flex flex-col" style="display: flex; flex-direction: column;">
                        <span
                            class="text-sm font-semibold tracking-wider text-white/50 uppercase"
                            style="font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; letter-spacing: 0.05em; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; font-family: 'lato';"
                            >Created by</span
                        >
                        <span
                            class="text-2xl font-bold tracking-tight"
                            style="font-size: 1.5rem; line-height: 2rem; font-weight: 700; letter-spacing: -0.025em; font-family: 'lato-extrabold';"
                            >Humanspeak</span
                        >
                    </div>
                </div>
            </div>

            <!-- Svelte Badge -->
            <div
                class="flex items-center rounded-2xl border border-white/10 bg-white/5 p-4 pr-6 shadow-xl"
                style="display: flex; align-items: center; gap: 1rem; border-radius: 1rem; border: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(255, 255, 255, 0.05); padding: 1rem; padding-right: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);"
            >
                <img
                    src="{url}/svelte-logo.svg"
                    alt="Svelte"
                    class="h-12 w-12"
                    style="height: 3rem; width: 3rem;"
                />
                <div class="flex flex-col" style="display: flex; flex-direction: column;">
                    <span
                        class="text-xs font-semibold tracking-wider text-[#ff3e00] uppercase"
                        style="font-size: 0.75rem; line-height: 1rem; font-weight: 600; letter-spacing: 0.05em; color: #ff3e00; text-transform: uppercase; font-family: 'lato';"
                        >Built for</span
                    >
                    <span
                        class="text-xl font-bold tracking-tight"
                        style="font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; letter-spacing: -0.025em; font-family: 'lato-extrabold';"
                        >Svelte 5</span
                    >
                </div>
            </div>
        </div>
    </div>
</div>
