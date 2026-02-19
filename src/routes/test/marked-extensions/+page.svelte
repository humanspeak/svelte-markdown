<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import Alert from '$lib/test/marked_extensions/Alert.svelte'
    import type { RendererComponent, Renderers } from '$lib/utils/markdown-parser.js'
    import type { TokenizerExtension } from 'marked'

    let htmlBody = `
> [!WARNING]
> Lesson decline/cancelation reason
	`

    const alertTokenizer: TokenizerExtension = {
        name: 'alert',
        level: 'block',
        start: (src: string) => {
            return src.indexOf('> [!')
        },
        tokenizer: (src: string) => {
            const match = src.match(/^(?:>\s*\[!(\w+)\]\n)([^\n]*(?:\n(?:>)[^\n]*)*)(?:\n|$)/)
            if (match) {
                return {
                    type: 'alert',
                    raw: match[0],
                    text: match[2],
                    level: match[1]
                }
            }
        }
    }

    const extensions = [{ extensions: [alertTokenizer] }]

    interface CustomRenderers extends Renderers {
        alert: RendererComponent
    }

    const renderers: Partial<CustomRenderers> = {
        alert: Alert
    }
</script>

<div class="container">
    <textarea bind:value={htmlBody} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview">
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
        min-height: 200px;
        padding: 0.5rem;
    }

    .preview {
        padding: 0.5rem;
    }
</style>
