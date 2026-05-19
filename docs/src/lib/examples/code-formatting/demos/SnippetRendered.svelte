<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const markdown = `## Code Block Styling

Customize code block rendering without an extension — just an inline \`{#snippet code}\` block.

### JavaScript

\`\`\`js
function fibonacci(n) {
    if (n <= 1) return n
    return fibonacci(n - 1) + fibonacci(n - 2)
}

const result = fibonacci(10)
console.log(result)
\`\`\`

### CSS

\`\`\`css
.container {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
}
\`\`\`

### TypeScript

\`\`\`ts
interface User {
    name: string
    age: number
    email?: string
}

const greet = (user: User): string =>
    \`Hello, \${user.name}! You are \${user.age} years old.\`
\`\`\`

### Bash

\`\`\`bash
pnpm add @humanspeak/svelte-markdown
\`\`\`

> **Tip:** The snippet gets \`{ lang, text }\` so the language label can drive per-language styling.`
</script>

<!--
  Snippet override for the `code` token — wraps each fenced code block
  in a brut-themed container with a language badge in the corner. No
  extension required, full markup control per page.
-->
<div class="prose prose-sm dark:prose-invert mx-auto max-w-4xl px-6 py-6">
    <SvelteMarkdown source={markdown}>
        {#snippet code(props: { lang: string; text: string })}
            <div class="cf-block">
                {#if props.lang}
                    <div class="cf-lang">{props.lang}</div>
                {/if}
                <pre><code>{props.text}</code></pre>
            </div>
        {/snippet}
    </SvelteMarkdown>
</div>

<style>
    /* Container + lang badge use brut tokens so the chrome flips
       between light and dark themes. The pre is left on the brut bg
       surface with mono typography — no syntax highlighting (the
       snippet API doesn't provide tokenised output; the extension
       variant handles formatting separately). */
    :global(.cf-block) {
        position: relative;
        margin: 14px 0;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
    }
    :global(.cf-lang) {
        display: inline-block;
        padding: 4px 10px;
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        font-weight: 600;
    }
    :global(.cf-block pre) {
        margin: 0;
        padding: 14px 16px;
        background: transparent;
        color: var(--brut-ink);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.65;
        overflow-x: auto;
    }
    :global(.cf-block code) {
        background: transparent;
        color: inherit;
        padding: 0;
        border: 0;
    }
</style>
