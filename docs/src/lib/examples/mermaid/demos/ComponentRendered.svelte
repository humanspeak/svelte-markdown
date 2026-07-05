<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { markedMermaid, MermaidRenderer } from '@humanspeak/svelte-markdown/extensions'
    import { DemoSplitV2 } from '@humanspeak/docs-kit'

    const defaultMarkdown = `## Mermaid Diagrams

### Flowchart

\`\`\`mermaid
graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E
\`\`\`

### Sequence Diagram

\`\`\`mermaid
sequenceDiagram
    participant A as Alice
    participant B as Bob
    A->>B: Hello Bob!
    B->>A: Hi Alice!
    A->>B: How are you?
    B->>A: Great, thanks!
\`\`\`

### Mixed Content

Regular markdown works alongside diagrams: **bold**, *italic*, and \`inline code\`.

#### Class Diagram

\`\`\`mermaid
classDiagram
    class Animal {
        +String name
        +int age
        +makeSound()
    }
    class Dog {
        +fetch()
    }
    class Cat {
        +purr()
    }
    Animal <|-- Dog
    Animal <|-- Cat
\`\`\``

    // The markedMermaid extension parses `mermaid` code fences into
    // `mermaid` tokens; the MermaidRenderer component handles async
    // rendering, loading + error states, and dark-mode reactivity.
    interface MermaidRenderers extends Renderers {
        mermaid: RendererComponent
    }
    const renderers: Partial<MermaidRenderers> = {
        mermaid: MermaidRenderer
    }

    // Debounced live editor: `input` tracks the textarea verbatim,
    // `source` is what SvelteMarkdown actually renders. 500ms keeps the
    // mermaid renderer from thrashing during fast typing.
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            source = input
        }, 500)
    }
</script>

<DemoSplitV2 leftLabel="EDITOR" leftTone="markdown" rightLabel="PREVIEW" rightTone="diagrams">
    {#snippet left()}
        <textarea
            value={input}
            oninput={handleInput}
            class="md-editor"
            spellcheck="false"
            placeholder="Type markdown with ```mermaid code blocks..."></textarea>
    {/snippet}
    {#snippet right()}
        <div class="md-preview prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown {source} extensions={[markedMermaid()]} {renderers} />
        </div>
    {/snippet}
</DemoSplitV2>

<style>
    .md-editor {
        width: 100%;
        height: 100%;
        min-height: 360px;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--brut-ink, var(--foreground, inherit));
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.7;
        padding: 0;
    }
    .md-preview {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2, var(--muted-foreground, inherit));
    }
    .md-preview :global(h1),
    .md-preview :global(h2),
    .md-preview :global(h3),
    .md-preview :global(h4) {
        color: var(--brut-ink, var(--foreground, inherit));
        letter-spacing: -0.02em;
    }
    .md-preview :global(code) {
        background: var(--brut-bg-2, rgba(127, 127, 127, 0.08));
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.18));
        padding: 0 4px;
        font-size: 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .md-preview :global(blockquote) {
        border-left: 2px solid var(--brut-accent);
        padding-left: 12px;
        font-style: italic;
        color: var(--brut-ink-2);
    }
</style>
