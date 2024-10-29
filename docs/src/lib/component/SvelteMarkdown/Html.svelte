<script lang="ts">
    import hljs from 'highlight.js'

    interface Props {
        text: string
    }

    const { text }: Props = $props()

    const code = hljs.highlightAuto(text).value
</script>

<div>
    {@html code}
</div>
