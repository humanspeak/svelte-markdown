<script lang="ts">
    import sanitizeHtml from 'sanitize-html'

    interface Props {
        text: string
    }

    const { text }: Props = $props()

    const code = sanitizeHtml(text)
</script>

{@html code}
