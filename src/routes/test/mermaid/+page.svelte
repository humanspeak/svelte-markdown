<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { markedMermaid, MermaidRenderer } from '$lib/extensions/mermaid/index.js'
    import type { RendererComponent, Renderers } from '$lib/utils/markdown-parser.js'

    let htmlBody = $state(`# Mermaid Diagrams

## Flowchart

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

## Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob!
    B->>A: Hi Alice!
    A->>B: How are you?
    B->>A: Great, thanks!
\`\`\`

## Mixed Content

Regular markdown works alongside diagrams: **bold**, *italic*, and \`inline code\`.

- List item one
- List item two
`)

    const extensions = [markedMermaid()]

    interface MermaidRenderers extends Renderers {
        mermaid: RendererComponent
    }

    const renderers: Partial<MermaidRenderers> = {
        mermaid: MermaidRenderer
    }
</script>

<div class="container">
    <textarea
        bind:value={htmlBody}
        placeholder="Enter markdown with mermaid diagrams here"
        data-testid="markdown-input"
    ></textarea>
    <div class="preview" data-testid="preview">
        <SvelteMarkdown {extensions} source={htmlBody} {renderers} />
    </div>
</div>

<style>
    .container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding: 1rem;
    }

    textarea {
        min-height: 300px;
        padding: 0.5rem;
        font-family: monospace;
    }

    .preview {
        padding: 0.5rem;
    }
</style>
