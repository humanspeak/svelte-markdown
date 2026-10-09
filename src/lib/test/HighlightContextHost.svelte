<!--
Test-only host that sets the shared highlight context before mounting
`HighlightedCode`, so the resolution-order tests can exercise the context
channel without a full `SvelteMarkdown` tree.
-->
<script lang="ts">
    import { setContext } from 'svelte'
    import type { CodeHighlighter } from '../extensions/highlight/codeHighlighter.js'
    import { HIGHLIGHT_CONTEXT_KEY } from '../extensions/highlight/highlightContext.js'
    import HighlightedCode from '../extensions/highlight/HighlightedCode.svelte'

    interface Props {
        contextHighlighter?: CodeHighlighter
        propHighlighter?: CodeHighlighter
        lang: string
        text: string
    }

    const { contextHighlighter, propHighlighter, lang, text }: Props = $props()

    // Context is read once at init by HighlightedCode; the initial value is
    // the intended one.
    // svelte-ignore state_referenced_locally
    setContext(HIGHLIGHT_CONTEXT_KEY, contextHighlighter)
</script>

<HighlightedCode {lang} {text} highlighter={propHighlighter} />
