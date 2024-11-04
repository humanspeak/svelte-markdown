<script lang="ts">
    // import DOMPurify from 'isomorphic-dompurify'

    interface Props {
        text: string
    }

    const { text }: Props = $props()

    // const code = DOMPurify.sanitize(text)
</script>

{@html text}
