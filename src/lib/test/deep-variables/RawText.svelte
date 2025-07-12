<script lang="ts">
    interface Props {
        text?: string
        someDeepVariable?: Record<string, string>
    }
    const { text, someDeepVariable }: Props = $props()
</script>

<div>
    <p data-testid="rawtext">{text} {someDeepVariable?.text ?? 'no text'}</p>
</div>
