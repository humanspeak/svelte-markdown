<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    const { lang, text }: Props = $props()
</script>

<pre class={lang}><code>{text}</code></pre>
