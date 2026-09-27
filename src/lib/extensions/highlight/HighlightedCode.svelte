<!--
@component
Engine-agnostic drop-in replacement for the default `code` renderer that
renders fenced code blocks through whichever `CodeHighlighter` is configured
(Shiki, TanStack Highlight, or your own).

Same `Props` shape as the built-in `Code.svelte` (`lang`, `text`) so it slots
directly into the standard `renderers` prop with no new component API:

```svelte
<script>
  import { HighlightedCode, setCodeHighlighter } from '.../extensions/highlight'
  import { createTanstackHighlighter } from '.../extensions/tanstack-highlight'
  import { ts } from '@tanstack/highlight/languages/ts'
  setCodeHighlighter(createTanstackHighlighter({ languages: [ts] }))
</script>

<SvelteMarkdown {source} renderers={{ code: HighlightedCode }} />
```

The highlighter is resolved from (in priority order) an explicit `highlighter`
prop, Svelte context under `HIGHLIGHT_CONTEXT_KEY`, then the module singleton.

Highlighting is memoized: `html` is `$derived` purely from `(text, lang)` (and
the resolved highlighter), so re-renders during streaming do NOT re-highlight a
code block whose text has not changed. Every engine factory escapes the code
it emits and the unconfigured fallback escapes too, so the `{@html}` sink only
ever receives library-generated / escaped markup — never raw user input.
-->
<script lang="ts">
    import { getContext } from 'svelte'
    import { renderFallback, type CodeHighlighter } from './codeHighlighter.js'
    import { getCodeHighlighter, HIGHLIGHT_CONTEXT_KEY } from './highlightContext.js'

    interface Props {
        /** Language identifier from the code fence (e.g. `"js"`, `"typescript"`). Untrusted. */
        lang: string
        /** Raw text content of the code block. */
        text: string
        /** Optional explicit highlighter; overrides context and singleton. */
        highlighter?: CodeHighlighter
    }

    const { lang, text, highlighter }: Props = $props()

    // Context is stable for the component's lifetime; read once at init.
    const contextHighlighter = getContext<CodeHighlighter | undefined>(HIGHLIGHT_CONTEXT_KEY)

    const resolved = $derived(highlighter ?? contextHighlighter ?? getCodeHighlighter())

    // Memoized by (text, lang, resolved): unchanged blocks are not re-highlighted.
    const html = $derived(resolved ? resolved.highlight(text, lang) : renderFallback(text, lang))
</script>

<!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
{@html html}
