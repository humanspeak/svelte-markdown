<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { markedMermaid, MermaidRenderer } from '$lib/extensions/mermaid/index.js'

    let htmlBody = $state(`# Mermaid Snippets

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
\`\`\`
`)

    const extensions = [markedMermaid()]
</script>

<div class="container">
    <textarea
        bind:value={htmlBody}
        placeholder="Enter markdown with mermaid diagrams here"
        data-testid="markdown-input"
    ></textarea>
    <div class="preview" data-testid="preview">
        <SvelteMarkdown {extensions} source={htmlBody}>
            {#snippet mermaid(props: { text: string })}
                <div class="snippet-wrapper" data-testid="snippet-wrapper">
                    <MermaidRenderer text={props.text} />
                </div>
            {/snippet}
        </SvelteMarkdown>
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
