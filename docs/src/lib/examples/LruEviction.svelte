<script lang="ts">
    import { MemoryCache } from '@humanspeak/memory-cache'
    import { onMount } from 'svelte'

    // Create a small cache to demonstrate LRU eviction
    let maxSize = $state(5)
    let cache = $state(new MemoryCache<string>({ maxSize: maxSize }))

    type EntryDisplay = {
        key: string
        value: string
        accessOrder: number
    }

    let entries = $state<EntryDisplay[]>([])
    let evictionLog = $state<string[]>([])
    let nextId = $state(1)
    let accessCounter = $state(0)

    function updateEntries() {
        // Use entries() to read values without affecting LRU order
        const cacheEntries = cache.entries()
        entries = cacheEntries.map(([key, value], index) => ({
            key,
            value: value ?? '',
            accessOrder: index // Lower = least recently used
        }))
    }

    function addEntry() {
        const key = `item:${nextId}`
        const value = `Value #${nextId}`

        // Check if this will cause eviction
        if (cache.size() >= maxSize) {
            const lruKey = cache.keys()[0] // First key is LRU
            evictionLog = [`Evicted "${lruKey}" (LRU)`, ...evictionLog.slice(0, 9)]
        }

        cache.set(key, value)
        nextId++
        updateEntries()
    }

    function accessEntry(key: string) {
        cache.get(key) // This updates the access order
        accessCounter++
        updateEntries()
    }

    function resetCache() {
        cache = new MemoryCache<string>({ maxSize })
        entries = []
        evictionLog = []
        nextId = 1
        accessCounter = 0

        // Seed initial data
        for (let i = 1; i <= 3; i++) {
            cache.set(`item:${i}`, `Value #${i}`)
            nextId = i + 1
        }
        updateEntries()
    }

    function updateMaxSize() {
        cache = new MemoryCache<string>({ maxSize })
        resetCache()
    }

    function getPositionClass(index: number, total: number): string {
        if (index === 0) return 'bg-red-500/20 text-red-600'
        if (index === total - 1) return 'bg-green-500/20 text-green-600'
        return 'bg-yellow-500/20 text-yellow-600'
    }

    function getCapacityClass(current: number, max: number): string {
        const ratio = current / max
        if (ratio < 0.7) return 'bg-green-500'
        if (current < max) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    // Initialize once on mount
    onMount(() => {
        resetCache()
    })
</script>

<div class="flex w-full max-w-4xl flex-col gap-6 lg:flex-row">
    <!-- Controls Panel -->
    <div class="border-border bg-card w-full rounded-xl border p-6 shadow-sm lg:w-72">
        <h3 class="text-foreground mb-4 text-lg font-semibold">LRU Settings</h3>

        <div class="space-y-4">
            <div>
                <label
                    for="max-size-slider"
                    class="text-foreground mb-1.5 block text-sm font-medium"
                >
                    Max Size: {maxSize}
                </label>
                <input
                    id="max-size-slider"
                    type="range"
                    bind:value={maxSize}
                    onchange={updateMaxSize}
                    min="3"
                    max="10"
                    class="accent-brand-500 w-full"
                />
                <p class="text-muted-foreground mt-1 text-xs">Cache evicts LRU items when full</p>
            </div>

            <button
                onclick={addEntry}
                class="bg-brand-600 hover:bg-brand-700 w-full rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
            >
                <i class="fa-solid fa-plus mr-2"></i>
                Add New Entry
            </button>

            <button
                onclick={resetCache}
                class="border-border text-foreground hover:border-brand-500/50 w-full rounded-md border px-4 py-2 text-sm font-medium transition-colors"
            >
                <i class="fa-solid fa-rotate-left mr-2"></i>
                Reset Cache
            </button>
        </div>

        <!-- Stats -->
        <div class="bg-muted/50 mt-6 space-y-2 rounded-lg p-4 text-sm">
            <div class="flex justify-between">
                <span class="text-muted-foreground">Current size</span>
                <span class="text-foreground font-medium">{entries.length} / {maxSize}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-muted-foreground">Total accesses</span>
                <span class="text-foreground font-medium">{accessCounter}</span>
            </div>
            <div class="flex justify-between">
                <span class="text-muted-foreground">Total evictions</span>
                <span class="font-medium text-red-600">{evictionLog.length}</span>
            </div>
        </div>

        <!-- Eviction Log -->
        {#if evictionLog.length > 0}
            <div class="mt-4">
                <h4 class="text-foreground mb-2 text-sm font-medium">Eviction Log</h4>
                <div class="max-h-32 space-y-1 overflow-y-auto text-xs">
                    {#each evictionLog as log}
                        <div class="rounded bg-red-500/10 px-2 py-1 text-red-600 dark:text-red-400">
                            {log}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- Cache Visualization -->
    <div class="border-border bg-card flex-1 rounded-xl border p-6 shadow-sm">
        <div class="mb-4">
            <h3 class="text-foreground text-lg font-semibold">Cache Entries (LRU Order)</h3>
            <p class="text-muted-foreground text-sm">
                Click an entry to access it (moves to end). Top = Least Recently Used.
            </p>
        </div>

        <!-- Capacity indicator -->
        <div class="mb-4">
            <div class="mb-1 flex justify-between text-xs">
                <span class="text-muted-foreground">Capacity</span>
                <span class="font-medium" class:text-red-500={entries.length === maxSize}>
                    {entries.length}/{maxSize}
                </span>
            </div>
            <div class="bg-muted h-2 w-full overflow-hidden rounded-full">
                <div
                    class="h-full transition-all duration-300 {getCapacityClass(
                        entries.length,
                        maxSize
                    )}"
                    style="width: {(entries.length / maxSize) * 100}%"
                ></div>
            </div>
        </div>

        {#if entries.length === 0}
            <div class="text-muted-foreground flex h-48 items-center justify-center">
                Cache is empty
            </div>
        {:else}
            <div class="space-y-2">
                {#each entries as entry, index (entry.key)}
                    <button
                        onclick={() => accessEntry(entry.key)}
                        class="lru-entry group border-border bg-background hover:border-brand-500/50 flex w-full items-center justify-between rounded-lg border p-3 text-left transition-all hover:shadow-sm"
                    >
                        <div class="flex items-center gap-3">
                            <div
                                class="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold {getPositionClass(
                                    index,
                                    entries.length
                                )}"
                            >
                                {index + 1}
                            </div>
                            <div>
                                <div class="text-foreground font-mono text-sm font-medium">
                                    {entry.key}
                                </div>
                                <div class="text-muted-foreground text-xs">
                                    {entry.value}
                                </div>
                            </div>
                        </div>
                        <div class="flex items-center gap-2">
                            {#if index === 0}
                                <span
                                    class="rounded bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600"
                                >
                                    LRU (next eviction)
                                </span>
                            {:else if index === entries.length - 1}
                                <span
                                    class="rounded bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"
                                >
                                    MRU
                                </span>
                            {/if}
                            <i
                                class="fa-solid fa-hand-pointer text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                            ></i>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}

        <p class="text-muted-foreground mt-4 text-xs">
            <i class="fa-solid fa-lightbulb mr-1 text-yellow-500"></i>
            When the cache is full, adding a new entry evicts the LRU item (position #1).
        </p>
    </div>
</div>

<style>
    .lru-entry {
        animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-4px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
</style>
