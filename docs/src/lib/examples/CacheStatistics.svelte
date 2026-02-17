<script lang="ts">
    import {
        MemoryCache,
        type OnSetContext,
        type OnHitContext,
        type OnMissContext,
        type OnDeleteContext,
        type OnEvictContext
    } from '@humanspeak/memory-cache'
    import { onMount } from 'svelte'

    // Statistics
    let hits = $state(0)
    let misses = $state(0)
    let sets = $state(0)
    let deletes = $state(0)
    let evictions = $state(0)

    let hitRate = $derived(hits + misses > 0 ? (hits / (hits + misses)) * 100 : 0)

    // Operation log
    let operationLog = $state<{ type: string; key: string; timestamp: number }[]>([])

    function logOperation(type: string, key: string) {
        operationLog = [{ type, key, timestamp: Date.now() }, ...operationLog.slice(0, 19)]
    }

    // Create cache with hooks for monitoring
    let cache = $state<MemoryCache<string> | null>(null)

    function initCache() {
        cache = new MemoryCache<string>({
            maxSize: 5,
            ttl: 30000,
            hooks: {
                onSet: (ctx: OnSetContext<string>) => {
                    sets++
                    logOperation('SET', ctx.key)
                },
                onHit: (ctx: OnHitContext<string>) => {
                    hits++
                    logOperation('HIT', ctx.key)
                },
                onMiss: (ctx: OnMissContext) => {
                    misses++
                    logOperation('MISS', ctx.key)
                },
                onDelete: (ctx: OnDeleteContext<string>) => {
                    deletes++
                    logOperation('DELETE', ctx.key)
                },
                onEvict: (ctx: OnEvictContext<string>) => {
                    evictions++
                    logOperation('EVICT', ctx.key)
                }
            }
        })

        // Seed some data (these will trigger onSet)
        cache.set('user:1', 'Alice')
        cache.set('user:2', 'Bob')
        cache.set('config', 'production')
    }

    // Test operations
    function simulateHit() {
        if (!cache) return
        const keys = cache.keys()
        if (keys.length > 0) {
            const key = keys[Math.floor(Math.random() * keys.length)]
            cache.get(key)
        }
    }

    function simulateMiss() {
        if (!cache) return
        cache.get(`nonexistent:${Date.now()}`)
    }

    function simulateSet() {
        if (!cache) return
        const id = Math.random().toString(36).substring(2, 6)
        cache.set(`item:${id}`, `Value ${id}`)
    }

    function simulateDelete() {
        if (!cache) return
        const keys = cache.keys()
        if (keys.length > 0) {
            cache.delete(keys[0])
        }
    }

    function simulateBurst() {
        if (!cache) return
        // Simulate realistic traffic pattern
        for (let i = 0; i < 10; i++) {
            setTimeout(() => {
                const rand = Math.random()
                if (rand < 0.6) simulateHit()
                else if (rand < 0.8) simulateMiss()
                else if (rand < 0.95) simulateSet()
                else simulateDelete()
            }, i * 100)
        }
    }

    function resetStats() {
        hits = 0
        misses = 0
        sets = 0
        deletes = 0
        evictions = 0
        operationLog = []
        initCache()
    }

    function getOperationColor(type: string): string {
        switch (type) {
            case 'HIT':
                return 'text-green-600 bg-green-500/10'
            case 'MISS':
                return 'text-red-600 bg-red-500/10'
            case 'SET':
                return 'text-blue-600 bg-blue-500/10'
            case 'DELETE':
                return 'text-orange-600 bg-orange-500/10'
            case 'EVICT':
                return 'text-purple-600 bg-purple-500/10'
            default:
                return 'text-muted-foreground bg-muted'
        }
    }

    function formatTime(timestamp: number): string {
        const seconds = Math.floor((Date.now() - timestamp) / 1000)
        if (seconds < 1) return 'just now'
        if (seconds < 60) return `${seconds}s ago`
        return `${Math.floor(seconds / 60)}m ago`
    }

    // Initialize once on mount
    onMount(() => {
        initCache()
    })

    // Update timestamps every second
    let tick = $state(0)
    $effect(() => {
        const interval = setInterval(() => tick++, 1000)
        return () => clearInterval(interval)
    })
</script>

<div class="flex w-full max-w-5xl flex-col gap-6">
    <!-- Stats Cards -->
    <div class="grid grid-cols-2 gap-4 md:grid-cols-5">
        <div class="border-border bg-card rounded-xl border p-4 text-center shadow-sm">
            <div class="text-2xl font-bold text-green-600">{hits}</div>
            <div class="text-muted-foreground text-sm">Hits</div>
        </div>
        <div class="border-border bg-card rounded-xl border p-4 text-center shadow-sm">
            <div class="text-2xl font-bold text-red-600">{misses}</div>
            <div class="text-muted-foreground text-sm">Misses</div>
        </div>
        <div class="border-border bg-card rounded-xl border p-4 text-center shadow-sm">
            <div class="text-2xl font-bold text-blue-600">{sets}</div>
            <div class="text-muted-foreground text-sm">Sets</div>
        </div>
        <div class="border-border bg-card rounded-xl border p-4 text-center shadow-sm">
            <div class="text-2xl font-bold text-orange-600">{deletes}</div>
            <div class="text-muted-foreground text-sm">Deletes</div>
        </div>
        <div class="border-border bg-card rounded-xl border p-4 text-center shadow-sm">
            <div class="text-2xl font-bold text-purple-600">{evictions}</div>
            <div class="text-muted-foreground text-sm">Evictions</div>
        </div>
    </div>

    <div class="flex flex-col gap-6 lg:flex-row">
        <!-- Hit Rate Panel -->
        <div class="border-border bg-card flex-1 rounded-xl border p-6 shadow-sm">
            <h3 class="text-foreground mb-4 text-lg font-semibold">Hit Rate</h3>

            <!-- Circular progress -->
            <div class="mb-6 flex justify-center">
                <div class="relative h-32 w-32">
                    <svg class="h-full w-full -rotate-90" viewBox="0 0 100 100">
                        <!-- Background circle -->
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="8"
                            class="text-muted"
                        />
                        <!-- Progress circle -->
                        <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="8"
                            stroke-linecap="round"
                            stroke-dasharray="{hitRate * 2.51327} 251.327"
                            class="transition-all duration-300"
                            class:text-green-500={hitRate >= 70}
                            class:text-yellow-500={hitRate >= 40 && hitRate < 70}
                            class:text-red-500={hitRate < 40}
                        />
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-foreground text-2xl font-bold">{hitRate.toFixed(1)}%</span
                        >
                    </div>
                </div>
            </div>

            <div class="text-muted-foreground text-center text-sm">
                {hits} hits / {hits + misses} total requests
            </div>

            <!-- Control buttons -->
            <div class="mt-6 grid grid-cols-2 gap-2">
                <button
                    onclick={simulateHit}
                    class="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                    Simulate Hit
                </button>
                <button
                    onclick={simulateMiss}
                    class="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
                >
                    Simulate Miss
                </button>
                <button
                    onclick={simulateSet}
                    class="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                    Set Entry
                </button>
                <button
                    onclick={simulateDelete}
                    class="rounded-md bg-orange-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700"
                >
                    Delete Entry
                </button>
            </div>

            <div class="mt-4 flex gap-2">
                <button
                    onclick={simulateBurst}
                    class="border-brand-500 text-brand-600 hover:bg-brand-500/10 flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                >
                    <i class="fa-solid fa-bolt mr-1"></i>
                    Burst (10 ops)
                </button>
                <button
                    onclick={resetStats}
                    class="border-border text-foreground hover:border-brand-500/50 rounded-md border px-3 py-2 text-sm font-medium transition-colors"
                    title="Reset statistics"
                >
                    <i class="fa-solid fa-rotate-left"></i>
                </button>
            </div>
        </div>

        <!-- Operation Log -->
        <div class="border-border bg-card flex-1 rounded-xl border p-6 shadow-sm">
            <div class="mb-4 flex items-center justify-between">
                <h3 class="text-foreground text-lg font-semibold">Operation Log</h3>
                <span class="text-muted-foreground text-xs">Last 20 operations</span>
            </div>

            {#if operationLog.length === 0}
                <div class="text-muted-foreground flex h-64 items-center justify-center">
                    No operations yet
                </div>
            {:else}
                <div class="max-h-80 space-y-1.5 overflow-y-auto">
                    {#each operationLog as op, i (op.timestamp + i)}
                        <div
                            class="log-entry border-border bg-background flex items-center justify-between rounded-md border px-3 py-2"
                        >
                            <div class="flex items-center gap-2">
                                <span
                                    class="rounded px-2 py-0.5 text-xs font-bold {getOperationColor(
                                        op.type
                                    )}"
                                >
                                    {op.type}
                                </span>
                                <code class="text-foreground font-mono text-sm">{op.key}</code>
                            </div>
                            <span class="text-muted-foreground text-xs">
                                {#key tick}
                                    {formatTime(op.timestamp)}
                                {/key}
                            </span>
                        </div>
                    {/each}
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .log-entry {
        animation: slideIn 0.15s ease-out;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(-8px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
</style>
