<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import {
        createPeleEngine,
        markedMermaid,
        MermaidRenderer,
        setMermaidEngine
    } from '$lib/extensions/mermaid-pele/index.js'
    import type { RendererComponent, Renderers } from '$lib/utils/markdown-parser.js'
    import flowchart from 'pele/diagrams/flowchart'
    import { onDestroy } from 'svelte'

    interface ImperativeMarkdownHandle {
        writeChunk: (_chunk: string) => void
        resetStream: (_nextSource?: string) => void
    }

    // Synchronous engine: the diagram can render in the same frame as each completed line.
    setMermaidEngine(createPeleEngine({ diagrams: [flowchart] }))

    const STREAM_SOURCE = `Here is the flow:

\`\`\`mermaid
flowchart LR
  A[Request] --> B{Cached?}
  B -->|yes| C[Return]
  B -->|no| D[Fetch]
  D --> C
\`\`\`

Done.`

    const STREAM_LINES = STREAM_SOURCE.split('\n')
    const LINE_DELAY_MS = 50

    const extensions = [markedMermaid({ renderOpenFences: true })]

    interface MermaidRenderers extends Renderers {
        mermaid: RendererComponent
    }

    const renderers: Partial<MermaidRenderers> = {
        mermaid: MermaidRenderer
    }

    let markdown: ImperativeMarkdownHandle | undefined = $state()
    let done = $state(false)
    let streamTimer: ReturnType<typeof setTimeout> | undefined

    const start = () => {
        if (streamTimer) clearTimeout(streamTimer)
        markdown?.resetStream()
        done = false
        let index = 0
        const writeNextLine = () => {
            if (index >= STREAM_LINES.length) {
                done = true
                return
            }
            const isLast = index === STREAM_LINES.length - 1
            markdown?.writeChunk(STREAM_LINES[index] + (isLast ? '' : '\n'))
            index++
            streamTimer = setTimeout(writeNextLine, LINE_DELAY_MS)
        }
        writeNextLine()
    }

    onDestroy(() => {
        if (streamTimer) clearTimeout(streamTimer)
    })
</script>

<div class="container" data-testid="mermaid-streaming-page">
    <button type="button" data-testid="stream-start" onclick={start}>Stream</button>
    {#if done}
        <p data-testid="stream-done">Stream complete</p>
    {/if}
    <div class="preview" data-testid="preview">
        <SvelteMarkdown bind:this={markdown} source="" streaming {extensions} {renderers} />
    </div>
</div>

<style>
    .container {
        padding: 1rem;
    }
</style>
