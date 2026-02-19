<script lang="ts">
    import katex from 'katex'

    interface Props {
        text: string
        displayMode?: boolean
    }

    const { text, displayMode = false }: Props = $props()

    const html = $derived(katex.renderToString(text, { throwOnError: false, displayMode }))
</script>

<!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
{@html html}
