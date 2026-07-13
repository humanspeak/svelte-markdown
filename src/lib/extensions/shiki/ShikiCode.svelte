<!--
@component
SPIKE — a drop-in replacement for the default `code` renderer that renders
fenced code blocks with Shiki syntax highlighting.

Same `Props` shape as the built-in `Code.svelte` (`lang`, `text`) so it slots
directly into the standard `renderers` prop with no new component API:

```svelte
<script>
  import { createShikiHighlighter, ShikiCode, setShikiHighlighter } from '.../extensions/shiki'
  import js from 'shiki/langs/javascript.mjs'
  import githubDark from 'shiki/themes/github-dark.mjs'
  setShikiHighlighter(createShikiHighlighter({ langs: [js], themes: [githubDark] }))
</script>

<SvelteMarkdown {source} renderers={{ code: ShikiCode }} />
```

The highlighter is resolved from (in priority order) an explicit `highlighter`
prop, Svelte context under `SHIKI_CONTEXT_KEY`, then the module singleton.

Highlighting is memoized: `html` is `$derived` purely from `(text, lang)` (and
the resolved highlighter), so re-renders during streaming do NOT re-highlight a
code block whose text has not changed. Shiki escapes the code text it emits, and
the unregistered-language fallback escapes too, so the `{@html}` sink only ever
receives library-generated / escaped markup — never raw user input.
-->
<script lang="ts">
    import { getContext } from 'svelte'
    import { escapeHtml, type ShikiHighlighter } from './createShikiHighlighter.js'
    import { getShikiHighlighter, SHIKI_CONTEXT_KEY } from './shikiContext.js'

    interface Props {
        /** Language identifier from the code fence (e.g. `"js"`, `"typescript"`). Untrusted. */
        lang: string
        /** Raw text content of the code block. */
        text: string
        /** Optional explicit highlighter; overrides context and singleton. */
        highlighter?: ShikiHighlighter
    }

    const { lang, text, highlighter }: Props = $props()

    // Context is stable for the component's lifetime; read once at init.
    const contextHighlighter = getContext<ShikiHighlighter | undefined>(SHIKI_CONTEXT_KEY)

    const resolved = $derived(highlighter ?? contextHighlighter ?? getShikiHighlighter())

    // Memoized by (text, lang, resolved): unchanged blocks are not re-highlighted.
    const html = $derived(
        resolved
            ? resolved.highlight(text, lang)
            : `<pre class="shiki-fallback"><code>${escapeHtml(text)}</code></pre>`
    )
</script>

<!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
{@html html}
