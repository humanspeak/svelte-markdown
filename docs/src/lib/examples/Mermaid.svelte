<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { markedMermaid, MermaidRenderer } from '@humanspeak/svelte-markdown/extensions'
    import { createHighlighter } from 'shiki'
    import { onMount } from 'svelte'

    const defaultMarkdown = `# Mermaid Diagrams

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

> **Tip:** Use \\\`\\\`\\\`mermaid code blocks to create diagrams.

### Class Diagram

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

    let mode: 'component' | 'snippet' = $state('component')
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    const extensions = [markedMermaid()]

    interface MermaidRenderers extends Renderers {
        mermaid: RendererComponent
    }

    const renderers: Partial<MermaidRenderers> = {
        mermaid: MermaidRenderer
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value

        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
            source = input
        }, 500)
    }

    function reset() {
        input = defaultMarkdown
        source = defaultMarkdown
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
    }

    const componentCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { markedMermaid, MermaidRenderer }
    from '@humanspeak/svelte-markdown/extensions'

  const renderers = { mermaid: MermaidRenderer }
\x3C/script>

\x3CSvelteMarkdown
  source={markdown}
  extensions={[markedMermaid()]}
  {renderers}
/>`

    const snippetCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { markedMermaid, MermaidRenderer }
    from '@humanspeak/svelte-markdown/extensions'
\x3C/script>

\x3CSvelteMarkdown
  source={markdown}
  extensions={[markedMermaid()]}
>
  {#snippet mermaid(props)}
    \x3Cdiv class="my-diagram-wrapper">
      \x3CMermaidRenderer text={props.text} />
    \x3C/div>
  {/snippet}
\x3C/SvelteMarkdown>`

    let highlightedComponent = $state('')
    let highlightedSnippet = $state('')

    onMount(async () => {
        const highlighter = await createHighlighter({
            themes: ['github-light', 'one-dark-pro'],
            langs: ['svelte']
        })

        function highlight(code: string): string {
            const light = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'github-light' })
            const dark = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'one-dark-pro' })
            return `<div class="shiki-light">${light}</div><div class="shiki-dark">${dark}</div>`
        }

        highlightedComponent = highlight(componentCode)
        highlightedSnippet = highlight(snippetCode)
    })
</script>

<div class="mx-auto w-full max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h2 class="text-foreground text-2xl font-bold">Mermaid Diagrams</h2>
            <p class="text-muted-foreground mt-1 text-sm">
                Live Mermaid diagram rendering powered by the <code
                    class="bg-muted text-brand-600 rounded px-1 py-0.5 text-xs">extensions</code
                >
                prop with built-in helpers. Edit the markdown to try your own diagrams.
            </p>
        </div>
        <button
            onclick={reset}
            class="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
            <i class="fa-solid fa-rotate-right text-xs"></i>
            Reset
        </button>
    </div>

    <!-- Install Note -->
    <div class="border-border bg-card mb-6 rounded-xl border p-4 shadow-sm">
        <div class="flex items-start gap-3">
            <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm text-amber-600"
            >
                <i class="fa-solid fa-download"></i>
            </div>
            <div>
                <p class="text-foreground text-sm font-medium">Peer Dependency</p>
                <p class="text-muted-foreground mt-0.5 text-xs">
                    <code class="bg-muted rounded px-1">mermaid</code> is not bundled with this
                    package — install it separately:
                    <code class="bg-muted rounded px-1">npm install mermaid</code>
                </p>
            </div>
        </div>
    </div>

    <!-- Mode Toggle -->
    <div class="mb-6 flex items-center gap-3">
        <button
            onclick={() => (mode = 'component')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'component'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Component Renderers
        </button>
        <button
            onclick={() => (mode = 'snippet')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'snippet'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            Snippet Overrides
        </button>
    </div>

    <!-- Info Banner -->
    <div class="border-border bg-card mb-6 rounded-xl border p-4 shadow-sm">
        {#if mode === 'component'}
            <div class="flex items-start gap-3">
                <div
                    class="bg-brand-500/10 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                >
                    <i class="fa-solid fa-cube"></i>
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Component Renderers</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        The built-in <code class="bg-muted rounded px-1">MermaidRenderer</code>
                        component handles async rendering, loading/error states, and dark mode reactivity.
                        Pass it via the
                        <code class="bg-muted rounded px-1">renderers</code> prop for zero-config diagram
                        support.
                    </p>
                </div>
            </div>
        {:else}
            <div class="flex items-start gap-3">
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-sm text-purple-600"
                >
                    <i class="fa-solid fa-scissors"></i>
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Snippet Overrides</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Use a <code class="bg-muted rounded px-1">{'{#snippet mermaid}'}</code>
                        to wrap <code class="bg-muted rounded px-1">MermaidRenderer</code> with custom
                        markup — add wrapper divs, extra classes, or surrounding content. Since Mermaid
                        is async, the snippet delegates rendering to the component.
                    </p>
                </div>
            </div>
        {/if}
    </div>

    <!-- Split Pane -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Editor -->
        <div class="border-border bg-card flex flex-col rounded-xl border p-6 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
                <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                    Editor
                </h3>
                <span class="text-muted-foreground text-xs">
                    {input.length} characters
                </span>
            </div>
            <textarea
                value={input}
                oninput={handleInput}
                class="border-border bg-background text-foreground focus:ring-brand-500/50 min-h-[500px] w-full flex-1 resize-y rounded-lg border p-4 font-mono text-sm focus:ring-2 focus:outline-none"
                spellcheck="false"
                placeholder="Type markdown with ```mermaid blocks here..."
            ></textarea>
        </div>

        <!-- Preview -->
        <div class="border-border bg-card flex flex-col rounded-xl border p-6 shadow-sm">
            <div class="mb-3">
                <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                    Preview
                </h3>
            </div>
            <div class="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-auto">
                {#if mode === 'component'}
                    <SvelteMarkdown {source} {extensions} {renderers} />
                {:else}
                    <SvelteMarkdown {source} {extensions}>
                        {#snippet mermaid(props: { text: string })}
                            <div class="my-diagram-wrapper">
                                <MermaidRenderer text={props.text} />
                            </div>
                        {/snippet}
                    </SvelteMarkdown>
                {/if}
            </div>
        </div>
    </div>

    <!-- Code Reference -->
    <div class="border-border bg-card mt-6 rounded-xl border p-6 shadow-sm">
        <h3 class="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            {mode === 'component' ? 'Component Renderer' : 'Snippet Override'} Code
        </h3>
        <div class="prose prose-sm dark:prose-invert max-w-none">
            {#if mode === 'component'}
                {#if highlightedComponent}
                    <div class="shiki-container">
                        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                        {@html highlightedComponent}
                    </div>
                {:else}
                    <pre class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                            class="text-foreground">{componentCode}</code
                        ></pre>
                {/if}
            {:else if highlightedSnippet}
                <div class="shiki-container">
                    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                    {@html highlightedSnippet}
                </div>
            {:else}
                <pre class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                        class="text-foreground">{snippetCode}</code
                    ></pre>
            {/if}
        </div>
    </div>
</div>
