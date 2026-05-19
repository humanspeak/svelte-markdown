<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { MarkedExtension } from 'marked'
    import { onMount } from 'svelte'
    import { LoaderCircle } from '@lucide/svelte'

    const markdown = `## Code Formatting with marked-code-format

Auto-format code blocks with [Prettier](https://prettier.io/) by adding the \`prettier\` attribute to your code fences.

### JavaScript

\`\`\`js prettier
function   fibonacci(n){if(n<=1)return n
return fibonacci(n-1)+fibonacci(n-2)}

const   result=fibonacci(10)
console.log(result)
\`\`\`

### CSS

\`\`\`css prettier
.container{display:flex;justify-content:center;align-items:center;gap:1rem}
.card{border-radius:0.5rem;padding:1rem;box-shadow:0 1px 3px rgba(0,0,0,0.12)}
\`\`\`

### TypeScript

\`\`\`ts prettier
interface User{name:string;age:number;email?:string}
const greet=(user:User):string=>\`Hello, \${user.name}! You are \${user.age} years old.\`
\`\`\`

### Unformatted (no prettier attribute)

\`\`\`js
const x={a:1,b:2,c:3}
\`\`\`

> **Tip:** Only code fences with the \`prettier\` attribute are formatted. Others are left as-is.`

    // marked-code-format and prettier are heavy and not bundled by default
    // — lazy-load them on mount so the rest of the page paints first. The
    // `async: true` flag in the extension makes SvelteMarkdown await the
    // walkTokens transformation before rendering each token.
    let extensions = $state<MarkedExtension[]>([])
    let ready = $state(false)

    onMount(async () => {
        const [
            { default: markedCodeFormat },
            { default: prettierPluginBabel },
            { default: prettierPluginEstree },
            { default: prettierPluginCss },
            { default: prettierPluginTypescript }
        ] = await Promise.all([
            import('marked-code-format'),
            import('prettier/plugins/babel'),
            import('prettier/plugins/estree'),
            import('prettier/plugins/postcss'),
            import('prettier/plugins/typescript')
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
    })
</script>

<!--
  Code formatting via the `marked-code-format` extension. Code fences
  tagged with `prettier` get auto-formatted by Prettier through the
  extension's async `walkTokens` callback — no custom renderer needed.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    {#if ready}
        <SvelteMarkdown source={markdown} {extensions} />
    {:else}
        <div class="cf-loading">
            <LoaderCircle class="size-4 animate-spin" />
            Loading formatter…
        </div>
    {/if}
</div>

<style>
    .cf-loading {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 2rem 0;
        font-size: 0.875rem;
        color: var(--brut-ink-3, currentColor);
    }
</style>
