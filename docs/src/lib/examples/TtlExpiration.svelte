<script lang="ts">
    import { MemoryCache } from '@humanspeak/memory-cache'
    import { onMount } from 'svelte'

    type CachedItem = { value: string; createdAt: number }

    // State for custom TTL
    let customTtl = $state(10)

    // Create a new cache whenever TTL changes
    let cache = $state(new MemoryCache<CachedItem>({ ttl: customTtl * 1000, maxSize: 20 }))

    type EntryDisplay = {
        key: string
        value: string
        createdAt: number
        remainingMs: number
        remainingPercent: number
    }

    let entries = $state<EntryDisplay[]>([])
    let inputKey = $state('')
    let inputValue = $state('')
    let expiredCount = $state(0)

    function updateEntries() {
        const now = Date.now()
        const keys = cache.keys()
        const ttlMs = customTtl * 1000

        entries = keys
            .map((key) => {
                const data = cache.get(key)
                if (!data) return null

                const elapsed = now - data.createdAt
                const remainingMs = Math.max(0, ttlMs - elapsed)
                const remainingPercent = (remainingMs / ttlMs) * 100

                return {
                    key,
                    value: data.value,
                    createdAt: data.createdAt,
                    remainingMs,
                    remainingPercent
                }
            })
            .filter((e): e is EntryDisplay => e !== null && e.remainingMs > 0)
    }

    function handleAdd() {
        if (!inputKey.trim()) return

        const key = inputKey.trim()
        const value = inputValue.trim() || `Value ${Date.now()}`

        cache.set(key, { value, createdAt: Date.now() })
        updateEntries()

        inputKey = ''
        inputValue = ''
    }

    function addRandomEntry() {
        const id = Math.random().toString(36).substring(2, 8)
        const key = `item:${id}`
        cache.set(key, { value: `Random value ${id}`, createdAt: Date.now() })
        updateEntries()
    }

    function formatTime(ms: number): string {
        const seconds = Math.ceil(ms / 1000)
        return `${seconds}s`
    }

    function getProgressColor(percent: number): string {
        if (percent > 60) return 'bg-green-500'
        if (percent > 30) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    function updateTtl() {
        // Recreate cache with new TTL
        cache = new MemoryCache<CachedItem>({ ttl: customTtl * 1000, maxSize: 20 })
        entries = []
        expiredCount = 0
        // Add initial entries
        cache.set('session:abc', { value: 'User session data', createdAt: Date.now() })
        cache.set('token:xyz', { value: 'Auth token', createdAt: Date.now() - 3000 })
        updateEntries()
    }

    // Update timer
    let interval: ReturnType<typeof setInterval>

    $effect(() => {
        interval = setInterval(() => {
            const previousCount = entries.length
            updateEntries()
            const newCount = entries.length
            if (newCount < previousCount) {
                expiredCount += previousCount - newCount
            }
        }, 100)

        return () => clearInterval(interval)
    })

    // Seed initial data on mount
    onMount(() => {
        cache.set('session:abc', { value: 'User session data', createdAt: Date.now() })
        cache.set('token:xyz', { value: 'Auth token', createdAt: Date.now() - 3000 })
        cache.set('temp:123', { value: 'Temporary data', createdAt: Date.now() - 7000 })
        updateEntries()
    })
</script>

<div class="flex w-full max-w-4xl flex-col gap-6 lg:flex-row">
    <!-- Controls Panel -->
    <div class="border-border bg-card w-full rounded-xl border p-6 shadow-sm lg:w-80">
        <h3 class="text-foreground mb-4 text-lg font-semibold">Add Entry with TTL</h3>

        <div class="space-y-4">
            <div>
                <label for="ttl-key" class="text-foreground mb-1.5 block text-sm font-medium"
                    >Key</label
                >
                <input
                    id="ttl-key"
                    type="text"
                    bind:value={inputKey}
                    placeholder="cache:key"
                    class="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-brand-500 w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                />
            </div>

            <div>
                <label for="ttl-value" class="text-foreground mb-1.5 block text-sm font-medium"
                    >Value</label
                >
                <input
                    id="ttl-value"
                    type="text"
                    bind:value={inputValue}
                    placeholder="Optional value"
                    class="border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-brand-500 w-full rounded-md border px-3 py-2 text-sm focus:outline-none"
                />
            </div>

            <div>
                <label for="ttl-slider" class="text-foreground mb-1.5 block text-sm font-medium">
                    TTL: {customTtl} seconds
                </label>
                <input
                    id="ttl-slider"
                    type="range"
                    bind:value={customTtl}
                    onchange={updateTtl}
                    min="3"
                    max="30"
                    class="accent-brand-500 w-full"
                />
            </div>

            <div class="flex gap-2">
                <button
                    onclick={handleAdd}
                    class="bg-brand-600 hover:bg-brand-700 flex-1 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                    Add Entry
                </button>
                <button
                    onclick={addRandomEntry}
                    class="border-border text-foreground hover:border-brand-500/50 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                    title="Add random entry"
                >
                    <i class="fa-solid fa-shuffle"></i>
                </button>
            </div>
        </div>

        <!-- Stats -->
        <div class="bg-muted/50 mt-6 rounded-lg p-4">
            <div class="flex justify-between text-sm">
                <span class="text-muted-foreground">Active entries</span>
                <span class="text-foreground font-medium">{entries.length}</span>
            </div>
            <div class="mt-2 flex justify-between text-sm">
                <span class="text-muted-foreground">Expired (session)</span>
                <span class="font-medium text-red-600">{expiredCount}</span>
            </div>
        </div>
    </div>

    <!-- Entries Panel -->
    <div class="border-border bg-card flex-1 rounded-xl border p-6 shadow-sm">
        <div class="mb-4 flex items-center justify-between">
            <h3 class="text-foreground text-lg font-semibold">Cache Entries</h3>
            <span class="text-muted-foreground text-xs"> Watch entries expire in real-time </span>
        </div>

        {#if entries.length === 0}
            <div class="text-muted-foreground flex h-64 flex-col items-center justify-center">
                <i class="fa-solid fa-clock text-muted-foreground/50 mb-3 text-3xl"></i>
                <p>No active entries</p>
                <p class="text-sm">Add some entries to see TTL in action</p>
            </div>
        {:else}
            <div class="space-y-3">
                {#each entries as entry (entry.key)}
                    <div
                        class="ttl-entry border-border bg-background overflow-hidden rounded-lg border"
                    >
                        <div class="flex items-center justify-between p-3">
                            <div class="min-w-0 flex-1">
                                <div class="text-foreground truncate font-mono text-sm font-medium">
                                    {entry.key}
                                </div>
                                <div class="text-muted-foreground truncate text-xs">
                                    {entry.value}
                                </div>
                            </div>
                            <div class="ml-3 text-right">
                                <div
                                    class="text-lg font-bold tabular-nums"
                                    class:text-red-500={entry.remainingMs < 3000}
                                    class:text-yellow-500={entry.remainingMs >= 3000 &&
                                        entry.remainingMs < 6000}
                                    class:text-green-500={entry.remainingMs >= 6000}
                                >
                                    {formatTime(entry.remainingMs)}
                                </div>
                            </div>
                        </div>
                        <!-- Progress bar -->
                        <div class="bg-muted h-1 w-full">
                            <div
                                class="h-full transition-all duration-100 {getProgressColor(
                                    entry.remainingPercent
                                )}"
                                style="width: {entry.remainingPercent}%"
                            ></div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style>
    .ttl-entry {
        animation: slideIn 0.2s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: scale(0.95);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
</style>
