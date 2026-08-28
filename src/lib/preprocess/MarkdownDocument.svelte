<!--
@component

Wrapper emitted by the markdown preprocessor for each `.md` file. It merges the
per-file source with any renderers/options a parent layout published through
`setMarkdownDocumentContext`, then hands everything to `<SvelteMarkdown>`.

Components imported in the markdown file's own `<script>` block arrive as
`components` and are registered as HTML tag renderers, so `<Counter />` in the
body resolves to the imported component.
-->
<script lang="ts">
    import type { HtmlRenderers } from '$lib/renderers/html/index.js'
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { getMarkdownDocumentContext } from './context.js'

    const {
        source,
        components = {},
        ...passThrough
    }: {
        source: string
        components?: HtmlRenderers
        [key: string]: unknown
    } = $props()

    const config = getMarkdownDocumentContext()

    // SvelteMarkdown merges a partial `html` map over the built-in tag
    // renderers, so only the additions need to be listed here.
    const renderers = $derived({
        ...config.renderers,
        html: { ...config.renderers?.html, ...components }
    })
</script>

<SvelteMarkdown {source} {...config} {renderers} {...passThrough} />
