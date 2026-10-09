<script lang="ts">
    import type { StreamingMotionProps } from '../../streaming/motion/types.js'
    import FadeWords from '../../streaming/motion/FadeWords.svelte'
    const props: StreamingMotionProps = $props()
</script>

<FadeWords {...props}>
    {#snippet segment(part)}
        <mark data-new={part.isNew} data-change={part.change}>{part.text}</mark>
    {/snippet}
</FadeWords>
