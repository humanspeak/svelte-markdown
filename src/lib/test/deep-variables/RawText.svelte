<script lang="ts">
    interface Props {
        text?: string
        someDeepVariable?: Record<string, string>
    }
    const { text, someDeepVariable }: Props = $props()

    $inspect('someDeepVariable', someDeepVariable)
</script>

<div>
    <p>{text} {someDeepVariable?.text ?? 'no text'}</p>
</div>
