<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { MarkedExtension } from 'marked'
    import { onMount } from 'svelte'
    import { RotateCw, Download, Zap, Scissors, LoaderCircle } from '@lucide/svelte'

    const defaultMarkdown = `# Code Formatting with marked-code-format

Auto-format code blocks with [Prettier](https://prettier.io/) by adding the \`prettier\` attribute to your code fences.

## JavaScript

\`\`\`js prettier
function   fibonacci(n){if(n<=1)return n
return fibonacci(n-1)+fibonacci(n-2)}

const   result=fibonacci(10)
console.log(result)
\`\`\`

## CSS

\`\`\`css prettier
.container{display:flex;justify-content:center;align-items:center;gap:1rem}
.card{border-radius:0.5rem;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.12)}
\`\`\`

## TypeScript

\`\`\`ts prettier
interface User{name:string;age:number;email?:string}
const greet=(user:User):string=>\`Hello, \${user.name}! You are \${user.age} years old.\`
\`\`\`

## Unformatted (no prettier attribute)

\`\`\`js
const x={a:1,b:2,c:3}
\`\`\`

> **Tip:** Only code fences with the \`prettier\` attribute are formatted. Others are left as-is.`

    let mode: 'extension' | 'snippet' = $state('extension')
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)
    let extensions = $state<MarkedExtension[]>([])
    let ready = $state(false)

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

    const extensionCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'
  import markedCodeFormat from 'marked-code-format'
  // Prettier standalone requires explicit parser plugins
  import prettierBabel from 'prettier/plugins/babel'
  import prettierEstree from 'prettier/plugins/estree'
  import prettierCss from 'prettier/plugins/postcss'
  import prettierTs from 'prettier/plugins/typescript'

  const source = '\\\`\\\`\\\`js prettier\\nconst x={a:1,b:2}\\n\\\`\\\`\\\`'

  const extensions = [
    markedCodeFormat({
      plugins: [prettierBabel, prettierEstree, prettierCss, prettierTs]
    })
  ]
\x3C/script>

\x3CSvelteMarkdown {source} {extensions} />`

    const snippetCode = `\x3Cscript lang="ts">
  import SvelteMarkdown from '@humanspeak/svelte-markdown'

  const source = '# Hello\\n\\n\\\`\\\`\\\`js\\nconst x = 1\\n\\\`\\\`\\\`'
\x3C/script>

\x3CSvelteMarkdown {source}>
  {#snippet code(props)}
    \x3Cdiv class="code-block">
      {#if props.lang}
        \x3Cspan class="code-lang">{props.lang}\x3C/span>
      {/if}
      \x3Cpre>\x3Ccode>{props.text}\x3C/code>\x3C/pre>
    \x3C/div>
  {/snippet}
\x3C/SvelteMarkdown>`

    let highlightedExtension = $state('')
    let highlightedSnippet = $state('')

    onMount(async () => {
        const [
            { default: markedCodeFormat },
            { default: prettierPluginBabel },
            { default: prettierPluginEstree },
            { default: prettierPluginCss },
            { default: prettierPluginTypescript },
            { createHighlighter }
        ] = await Promise.all([
            import('marked-code-format'),
            import('prettier/plugins/babel'),
            import('prettier/plugins/estree'),
            import('prettier/plugins/postcss'),
            import('prettier/plugins/typescript'),
            import('shiki')
        ])

        extensions = [
            markedCodeFormat({
                plugins: [
                    prettierPluginBabel,
                    prettierPluginEstree,
                    prettierPluginCss,
                    prettierPluginTypescript
                ]
            })
        ]
        ready = true

        const highlighter = await createHighlighter({
            themes: ['github-light', 'one-dark-pro'],
            langs: ['svelte']
        })

        function highlight(code: string): string {
            const light = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'github-light' })
            const dark = highlighter.codeToHtml(code, { lang: 'svelte', theme: 'one-dark-pro' })
            return `<div class="shiki-light">${light}</div><div class="shiki-dark">${dark}</div>`
        }

        highlightedExtension = highlight(extensionCode)
        highlightedSnippet = highlight(snippetCode)
    })
</script>

<div class="mx-auto w-full max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h2 class="text-foreground text-2xl font-bold">Code Formatting</h2>
            <p class="text-muted-foreground mt-1 text-sm">
                Live Prettier formatting powered by
                <code class="bg-muted text-brand-600 rounded px-1 py-0.5 text-xs"
                    >marked-code-format</code
                >
                — an async
                <code class="bg-muted text-brand-600 rounded px-1 py-0.5 text-xs">walkTokens</code>
                extension. Add the
                <code class="bg-muted rounded px-1 py-0.5 text-xs">prettier</code>
                attribute to any code fence to auto-format it.
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

    <!-- Install Note -->
    <div class="border-border bg-card mb-6 rounded-xl border p-4 shadow-sm">
        <div class="flex items-start gap-3">
            <div
                class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-sm text-amber-600"
            >
                <Download class="size-4" />
            </div>
            <div>
                <p class="text-foreground text-sm font-medium">Install Dependencies</p>
                <p class="text-muted-foreground mt-0.5 text-xs">
                    <code class="bg-muted rounded px-1">marked-code-format</code> and
                    <code class="bg-muted rounded px-1">prettier</code> are not bundled — install
                    them separately:
                    <code class="bg-muted rounded px-1"
                        >npm install marked-code-format prettier</code
                    >
                </p>
            </div>
        </div>
    </div>

    <!-- Mode Toggle -->
    <div class="mb-6 flex items-center gap-3">
        <button
            onclick={() => (mode = 'extension')}
            class="rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode === 'extension'
                ? 'bg-brand-600 text-white'
                : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
        >
            marked-code-format
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
        {#if mode === 'extension'}
            <div class="flex items-start gap-3">
                <div
                    class="bg-brand-500/10 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
                >
                    <Zap class="size-4" />
                </div>
                <div>
                    <p class="text-foreground text-sm font-medium">
                        Async Extension (No Renderers Needed)
                    </p>
                    <p class="text-muted-foreground mt-0.5 text-xs">
                        <code class="bg-muted rounded px-1">marked-code-format</code> uses an async
                        <code class="bg-muted rounded px-1">walkTokens</code> callback to format
                        code with Prettier. SvelteMarkdown detects the
                        <code class="bg-muted rounded px-1">async: true</code> flag and awaits the transformation
                        before rendering — no custom renderers required.
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
                        Override the <code class="bg-muted rounded px-1">{'{#snippet code}'}</code>
                        to customize code block rendering with a language badge and styled container.
                        No extension needed — just a snippet that receives
                        <code class="bg-muted rounded px-1">lang</code> and
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
                placeholder="Type markdown with code blocks here..."
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
                {#if mode === 'extension'}
                    {#if ready}
                        <SvelteMarkdown {source} {extensions} />
                    {:else}
                        <div class="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                            <LoaderCircle class="size-4 animate-spin" />
                            Loading formatter…
                        </div>
                    {/if}
                {:else}
                    <SvelteMarkdown {source}>
                        {#snippet code(props: { lang: string; text: string })}
                            <div class="code-block">
                                {#if props.lang}
                                    <div class="code-lang-badge">
                                        {props.lang}
                                    </div>
                                {/if}
                                <pre class={props.lang}><code>{props.text}</code></pre>
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
            {mode === 'extension' ? 'Extension' : 'Snippet Override'} Code
        </h3>
        <div class="prose prose-sm dark:prose-invert max-w-none">
            {#if mode === 'extension'}
                {#if highlightedExtension}
                    <div class="shiki-container">
                        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
                        {@html highlightedExtension}
                    </div>
                {:else}
                    <pre class="bg-background overflow-x-auto rounded-lg p-4 text-sm"><code
                            class="text-foreground">{extensionCode}</code
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

<style>
    .code-block {
        position: relative;
        margin: 1rem 0;
    }

    .code-lang-badge {
        position: absolute;
        top: 0;
        right: 0;
        padding: 0.125rem 0.5rem;
        font-size: 0.625rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-muted-foreground);
        background: var(--color-muted);
        border-radius: 0 0.375rem 0 0.375rem;
    }
</style>
