<!--
@component
Renders a fenced code block as a `<pre><code>` element. The language identifier
is applied as a CSS class on the `<pre>` for use with syntax highlighting libraries.

The text is emitted as one text node per line (each line keeps its trailing
`\n`), so while a fence streams in only the last line's text node changes and
completed lines keep their nodes. `<code>` has no element children;
`code.textContent` equals `text` exactly and is the supported way to read the
content (`code.firstChild` is only the first line). Server output contains
Svelte's hydration marker comments inside `<code>`; they are not part of
`textContent`.

@prop {string} lang - Language identifier from the code fence (e.g. `"js"`, `"typescript"`).
@prop {string} text - Raw text content of the code block.
-->
<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    const { lang, text }: Props = $props()
    // Split once per update; each entry carries its own terminator so a line's
    // rendering depends only on its own string, not on the array length.
    const lines = $derived.by(() => {
        const parts = text.split('\n')
        return parts.map((line, index) => (index < parts.length - 1 ? `${line}\n` : line))
    })
</script>

<pre class={lang}><code
        >{#each lines as line, index (index)}{line}{/each}</code
    ></pre>
