<script lang="ts">
    import MotionText from './MotionText.svelte'
    import type { StreamingMotionProps } from './types.js'
    const props: StreamingMotionProps = $props()
</script>

<MotionText {...props} granularity="grapheme" preset="fade-characters" />
