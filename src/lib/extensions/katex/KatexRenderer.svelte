<!--
@component
Renders an `inlineKatex` or `blockKatex` token (produced by {@link markedKatex})
to KaTeX HTML.

Pair with the matching extension via the `renderers` prop:

```svelte
<SvelteMarkdown
  source={markdown}
  extensions={[markedKatex()]}
  renderers={{ inlineKatex: KatexRenderer, blockKatex: KatexRenderer }}
/>
```

Requires `katex` to be installed (it's an optional peer dependency of
`@humanspeak/svelte-markdown`) and `katex/dist/katex.css` to be loaded — either
imported directly or pulled in via the CDN tag KaTeX recommends.

Hardcodes `throwOnError: false` so a single malformed expression renders as a
red KaTeX error span instead of throwing. If you need stricter behavior, pass
your own component for `inlineKatex` / `blockKatex` instead.
-->
<script lang="ts">
    import katex from 'katex'

    interface Props {
        /** TeX/LaTeX source to render. Token's inner content for delimiter pairs, or the full `\begin{env}...\end{env}` string for AMS environments. */
        text: string
        /** When `true`, render in display style (block); otherwise inline. */
        displayMode?: boolean
    }

    const { text, displayMode = false }: Props = $props()

    const html = $derived(katex.renderToString(text, { throwOnError: false, displayMode }))
</script>

<!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
{@html html}
