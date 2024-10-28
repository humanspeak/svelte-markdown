<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    let { lang, text }: Props = $props()
</script>

<pre class={lang}><code>{text}</code></pre>
