<script lang="ts">
    import { onMount, type Snippet } from 'svelte'

    type ParagraphLifecycleCallback = (..._args: [string | undefined, HTMLParagraphElement]) => void

    interface Props {
        text?: string
        children?: Snippet
        onParagraphMount?: ParagraphLifecycleCallback
        onParagraphDestroy?: ParagraphLifecycleCallback
    }

    const {
        text = undefined,
        children,
        onParagraphMount = undefined,
        onParagraphDestroy = undefined
    }: Props = $props()

    let element = $state<HTMLParagraphElement>()

    onMount(() => {
        if (!element) return

        onParagraphMount?.(text, element)

        return () => {
            onParagraphDestroy?.(text, element)
        }
    })
</script>

<p bind:this={element} data-tracked-paragraph={text}>{@render children?.()}</p>
