<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { marked, type TokenizerExtension } from 'marked'
    import Alert from '$lib/test/Alert.svelte'

    const htmlBody = `
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

    marked.use({ extensions: [alertTokenizer] })
    const options = marked.defaults
</script>

<SvelteMarkdown {options} source={htmlBody} renderers={{ alert: Alert }} />
