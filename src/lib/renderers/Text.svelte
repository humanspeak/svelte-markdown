<script lang="ts">
    import { type Snippet } from 'svelte'

    interface Props {
        text: string
        raw: string
        children?: Snippet
    }

    const { text, raw, children }: Props = $props()
</script>

{@render children?.()}
