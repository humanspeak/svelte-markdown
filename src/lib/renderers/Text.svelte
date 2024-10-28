<script lang="ts">
    import { type Snippet } from 'svelte'

    interface Props {
        text: string
        raw: string
        children: Snippet
    }

    let { text, raw, children }: Props = $props()
    console.log('text', text, raw, children)
</script>

{@render children?.()}
