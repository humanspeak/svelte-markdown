<!--
@component
Renders a Mermaid diagram through a pluggable {@link MermaidEngine}. The
built-in engine is mermaid.js, loaded on demand; other engines are injected
through the `engine` prop, Svelte context under `MERMAID_ENGINE_CONTEXT_KEY`,
or the module singleton set by `setMermaidEngine`, in that priority order.

The engine is only called after mount, so server-rendered output shows the
loading placeholder. Engine output is injected with `{@html}`, so engines must
produce safe SVG.
-->
<script lang="ts">
    import { getContext, onMount } from 'svelte'
    import { createMermaidJsEngine } from './createMermaidJsEngine.js'
    import { getMermaidEngine, MERMAID_ENGINE_CONTEXT_KEY } from './mermaidContext.js'
    import type { MermaidEngine, MermaidRenderResult } from './mermaidEngine.js'

    interface Props {
        text: string
        lightTheme?: string
        darkTheme?: string
        /** Optional explicit engine; overrides context and singleton. Defaults to mermaid.js. */
        engine?: MermaidEngine
        /**
         * `false` while the fence is still streaming (see `markedMermaid({ renderOpenFences })`).
         * An open diagram keeps the last good SVG on error and never shows the error box.
         */
        closed?: boolean
    }

    const {
        text,
        lightTheme = 'default',
        darkTheme = 'dark',
        engine,
        closed = true
    }: Props = $props()

    // Context is stable for the component's lifetime; read once at init.
    const contextEngine = getContext<MermaidEngine | undefined>(MERMAID_ENGINE_CONTEXT_KEY)
    // Per-instance default keeps today's behavior: one mermaid import/initialize per renderer.
    const fallbackEngine = createMermaidJsEngine()
    const resolved = $derived(engine ?? contextEngine ?? getMermaidEngine() ?? fallbackEngine)

    let mounted = $state(false)
    let dark = $state(false)
    let result = $state<MermaidRenderResult | null>(null)
    // Last successful SVG, kept so an open fence can stay on screen through errors.
    let lastSvg = $state('')
    let renderCounter = 0

    const apply = (value: MermaidRenderResult) => {
        result = value
        if (value.svg !== undefined) lastSvg = value.svg
    }

    $effect(() => {
        if (!mounted) return
        const current = ++renderCounter
        if (!closed && text === '') {
            // Nothing to draw yet for an open fence; skip the engine.
            result = null
            return
        }
        const output = resolved.render(text, { dark, lightTheme, darkTheme })
        if (output instanceof Promise) {
            // Engines never reject (contract); stale results are dropped.
            void output.then((value) => {
                if (current === renderCounter) apply(value)
            })
        } else {
            apply(output)
        }
    })

    onMount(() => {
        dark = document.documentElement.classList.contains('dark')
        mounted = true
        const observer = new MutationObserver(() => {
            dark = document.documentElement.classList.contains('dark')
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    })
</script>

{#if result?.svg !== undefined}
    <div class="mermaid-diagram" data-testid="mermaid-diagram">
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
        {@html result.svg}
    </div>
{:else if result?.error !== undefined && closed}
    <div class="mermaid-error" data-testid="mermaid-error">Diagram error: {result.error}</div>
{:else if !closed && lastSvg}
    <div class="mermaid-diagram" data-testid="mermaid-diagram">
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
        {@html lastSvg}
    </div>
{:else}
    <div class="mermaid-loading" data-testid="mermaid-loading">Loading diagram...</div>
{/if}
