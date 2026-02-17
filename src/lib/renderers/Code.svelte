<!--
@component
Renders a fenced code block as a `<pre><code>` element. The language identifier
is applied as a CSS class on the `<pre>` for use with syntax highlighting libraries.

@prop {string} lang - Language identifier from the code fence (e.g. `"js"`, `"typescript"`).
@prop {string} text - Raw text content of the code block.
-->
<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    const { lang, text }: Props = $props()
</script>

<pre class={lang}><code>{text}</code></pre>
