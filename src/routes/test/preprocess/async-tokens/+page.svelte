<script lang="ts">
    import MarkdownDocument from '$lib/preprocess/MarkdownDocument.svelte'
    import { setMarkdownDocumentContext } from '$lib/preprocess/context.js'
    import type { Token } from 'marked'

    // Serializable tokens, as a build-time preparser would emit them.
    const tokens: Token[] = [
        {
            type: 'paragraph',
            raw: 'Prepared async context',
            text: 'Prepared async context',
            tokens: [
                { type: 'text', raw: 'Prepared async context', text: 'Prepared async context' }
            ]
        }
    ]

    // An async extension supplied through layout-style context must not blank
    // server output for already-parsed token arrays.
    setMarkdownDocumentContext({
        extensions: [
            {
                async: true,
                walkTokens() {
                    return Promise.resolve()
                }
            }
        ]
    })
</script>

<div data-testid="async-tokens-document">
    <MarkdownDocument source={tokens} />
</div>
