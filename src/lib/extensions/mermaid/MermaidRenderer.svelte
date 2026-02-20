<script lang="ts">
    import { onMount } from 'svelte'

    interface Props {
        text: string
        lightTheme?: string
        darkTheme?: string
    }

    const { text, lightTheme = 'default', darkTheme = 'dark' }: Props = $props()

    let svg = $state('')
    let error = $state('')
    let loading = $state(true)
    let mermaidModule: typeof import('mermaid').default | null = $state(null)
    let renderCounter = 0

    async function renderDiagram(diagramText: string) {
        if (!mermaidModule) return
        const current = ++renderCounter
        try {
            error = ''
            const isDark = document.documentElement.classList.contains('dark')
            const theme = isDark ? darkTheme : lightTheme
            const themed = `%%{init: {'theme': '${theme}'}}%%\n${diagramText}`
            const id = `mermaid-${crypto.randomUUID()}`
            const result = await mermaidModule.render(id, themed)
            if (current !== renderCounter) return
            svg = result.svg
        } catch (e) {
            if (current !== renderCounter) return
            error = e instanceof Error ? e.message : String(e)
        }
    }

    $effect(() => {
        if (mermaidModule) {
            renderDiagram(text)
        }
    })

    onMount(() => {
        let observer: MutationObserver
        ;(async () => {
            try {
                const mod = (await import('mermaid')).default
                mod.initialize({ startOnLoad: false, securityLevel: 'strict' })
                mermaidModule = mod
            } catch (e) {
                error = e instanceof Error ? e.message : String(e)
            } finally {
                loading = false
            }
        })()

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.attributeName === 'class') {
                    renderDiagram(text)
                    return
                }
            }
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

        return () => observer.disconnect()
    })
</script>

{#if loading}
    <div class="mermaid-loading" data-testid="mermaid-loading">Loading diagram...</div>
{:else if error}
    <div class="mermaid-error" data-testid="mermaid-error">Diagram error: {error}</div>
{:else}
    <div class="mermaid-diagram" data-testid="mermaid-diagram">
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
        {@html svg}
    </div>
{/if}
