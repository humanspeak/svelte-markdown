<script lang="ts">
    interface Props {
        text?: string
    }
    const { text }: Props = $props()
</script>

<!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
{@html text}
