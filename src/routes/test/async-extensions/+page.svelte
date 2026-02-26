<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { MarkedExtension } from 'marked'

    let source = $state(`# Async Extension Test

\`\`\`js
hello world
\`\`\`

Some **bold** text between code blocks.

\`\`\`python
foo bar
\`\`\`
`)

    /**
     * A minimal async walkTokens extension that uppercases code block text.
     * Mimics the pattern used by marked-code-format (async: true + async walkTokens).
     */
    function asyncUppercaseCode(): MarkedExtension {
        return {
            async: true,
            async walkTokens(token) {
                if (token.type === 'code' && token.text) {
                    await new Promise((resolve) => setTimeout(resolve, 50))
                    token.text = token.text.toUpperCase()
                }
            }
        }
    }

    const extensions = [asyncUppercaseCode()]
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview" data-testid="preview">
        <SvelteMarkdown {source} {extensions} />
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
        min-height: 200px;
        padding: 0.5rem;
    }

    .preview {
        padding: 0.5rem;
    }
</style>
