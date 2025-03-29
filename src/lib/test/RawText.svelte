<script lang="ts">
    interface Props {
        text?: string
    }
    const { text }: Props = $props()

    $inspect('RawText.svelte', text)
</script>

<!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
{@html text}
