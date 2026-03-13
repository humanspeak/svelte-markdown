<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { markedAlert, AlertRenderer } from '@humanspeak/svelte-markdown/extensions'
    import { createHighlighter } from 'shiki'
    import { onMount } from 'svelte'
    import { RotateCw, Box, Scissors } from '@lucide/svelte'

    const defaultMarkdown = `## GitHub Alerts

GitHub-style alerts highlight critical information in documentation.

> [!NOTE]
> Useful information that users should know, even when skimming content.

> [!TIP]
> Helpful advice for doing things better or more easily.

> [!IMPORTANT]
> Key information users need to know to achieve their goal.

> [!WARNING]
> Urgent info that needs immediate user attention to avoid problems.

> [!CAUTION]
> Advises about risks or negative outcomes of certain actions.

### Mixed Content

Regular markdown works alongside alerts: **bold**, *italic*, and \`inline code\`.`

    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    const extensions = [markedAlert()]

    interface AlertRenderers extends Renderers {
        alert: RendererComponent
    }

    const renderers: Partial<AlertRenderers> = {
        alert: AlertRenderer
    }

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value

        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
            source = input
        }, 300)
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
  import type { RendererComponent, Renderers }
    from '@humanspeak/svelte-markdown'
  import { markedAlert, AlertRenderer }
    from '@humanspeak/svelte-markdown/extensions'

  const source = '> [!NOTE]\\n> Important info here.'

  interface AlertRenderers extends Renderers {
    alert: RendererComponent
  }

  const renderers: Partial\x3CAlertRenderers> = {
    alert: AlertRenderer
  }
\x3C/script>

\x3CSvelteMarkdown
  {source}
  extensions={[markedAlert()]}
  {renderers}
/>`

    const rendererCode = `\x3C!-- AlertRenderer.svelte (built-in) -->
\x3Cscript lang="ts">
  import type { AlertType } from './markedAlert.js'

  interface Props {
    text: string
    alertType: AlertType
  }

  const { text, alertType }: Props = $props()

  const titles: Record\x3CAlertType, string> = {
    note: 'Note',
    tip: 'Tip',
    important: 'Important',
    warning: 'Warning',
    caution: 'Caution'
  }
\x3C/script>

\x3Cdiv class="markdown-alert markdown-alert-{alertType}"
     role="note">
  \x3Cp class="markdown-alert-title">
    {titles[alertType]}
  \x3C/p>
  \x3Cp>{text}\x3C/p>
\x3C/div>`

    const snippetCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import { markedAlert }
    from '@humanspeak/svelte-markdown/extensions'

  const source = '> [!NOTE]\\n> Important info here.'
\x3C/script>

\x3CSvelteMarkdown
  {source}
  extensions={[markedAlert()]}
>
  {#snippet alert(props)}
    \x3Cdiv class="my-alert my-alert-{props.alertType}">
      \x3Cstrong>{props.alertType}\x3C/strong>
      \x3Cp>{props.text}\x3C/p>
    \x3C/div>
  {/snippet}
\x3C/SvelteMarkdown>`

    let mode: 'component' | 'snippet' = $state('component')
    let highlightedComponent = $state('')
    let highlightedRenderer = $state('')
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
        highlightedRenderer = highlight(rendererCode)
        highlightedSnippet = highlight(snippetCode)
    })
</script>

<div class="mx-auto w-full max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h2 class="text-foreground text-2xl font-bold">GitHub Alerts</h2>
            <p class="text-muted-foreground mt-1 text-sm">
                GitHub-style admonitions powered by the <code
                    class="bg-muted text-brand-600 rounded px-1 py-0.5 text-xs">markedAlert</code
                >
                extension. Supports NOTE, TIP, IMPORTANT, WARNING, and CAUTION types.
            </p>
        </div>
        <button
            onclick={reset}
            class="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
            <RotateCw class="size-3" />
            Reset
        </button>
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
                    <Box class="size-4" />
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Component Renderers</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        The built-in <code class="bg-muted rounded px-1">AlertRenderer</code>
                        component renders alerts with CSS classes for easy theming. Pass it via the
                        <code class="bg-muted rounded px-1">renderers</code> prop.
                    </p>
                </div>
            </div>
        {:else}
            <div class="flex items-start gap-3">
                <div
                    class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-500/10 text-sm text-purple-600"
                >
                    <Scissors class="size-4" />
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">Snippet Overrides</p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        Use a <code class="bg-muted rounded px-1">{'{#snippet alert}'}</code>
                        to fully customize the alert markup inline. Each snippet receives
                        <code class="bg-muted rounded px-1">alertType</code> and
                        <code class="bg-muted rounded px-1">text</code> props.
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
                placeholder="Type markdown with > [!TYPE] alert blocks here..."
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
                <SvelteMarkdown {source} {extensions} {renderers} />
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
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                        <p
                            class="text-muted-foreground not-prose mb-2 text-xs font-medium uppercase"
                        >
                            Usage
                        </p>
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
                    </div>
                    <div>
                        <p
                            class="text-muted-foreground not-prose mb-2 text-xs font-medium uppercase"
                        >
                            AlertRenderer.svelte
                        </p>
                        {#if highlightedRenderer}
                            <div class="shiki-container">
                                <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                                {@html highlightedRenderer}
                            </div>
                        {:else}
                            <pre class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                                    class="text-foreground">{rendererCode}</code
                                ></pre>
                        {/if}
                    </div>
                </div>
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

<style>
    :global(.markdown-alert) {
        border-radius: 6px;
        padding: 8px 16px;
        margin: 16px 0;
        border-left: 4px solid;
    }
    :global(.markdown-alert-title) {
        font-weight: 600;
        margin-bottom: 4px;
    }
    :global(.markdown-alert-note) {
        border-color: #539bf5;
        background-color: #1b2a3f;
    }
    :global(.markdown-alert-tip) {
        border-color: #57ab5a;
        background-color: #1b2f1f;
    }
    :global(.markdown-alert-important) {
        border-color: #986ee2;
        background-color: #2a1f3f;
    }
    :global(.markdown-alert-warning) {
        border-color: #c69026;
        background-color: #2f2a1b;
    }
    :global(.markdown-alert-caution) {
        border-color: #e5534b;
        background-color: #3f1b1b;
    }
</style>
