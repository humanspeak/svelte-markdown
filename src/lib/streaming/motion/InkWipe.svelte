<!--
@component
Wraps one motion segment in a feathered left-to-right mask reveal. Whether it
wipes is fixed at mount so a later re-render cannot cut an entrance short.
-->
<script lang="ts">
    import { untrack, type Snippet } from 'svelte'

    const {
        isNew,
        duration,
        delay,
        children
    }: { isNew: boolean; duration: number; delay: number; children: Snippet } = $props()
    const wipe = untrack(() => isNew)
</script>

<span
    class="ink"
    data-ink
    class:wipe
    data-ink-wipe={wipe ? '' : undefined}
    style:animation-duration={`${duration}s`}
    style:animation-delay={`${delay}s`}>{@render children()}</span
>

<style>
    .ink {
        display: inline-block;
        /* Room for the mask to cover the word while it lifts, without moving the layout. */
        padding-block: 0.5em;
        margin-block: -0.5em;
    }
    /* A feathered left-to-right reveal, like ink soaking in along the line. */
    .wipe {
        -webkit-mask-image: linear-gradient(90deg, #000 40%, transparent 60%);
        mask-image: linear-gradient(90deg, #000 40%, transparent 60%);
        -webkit-mask-size: 250% 100%;
        mask-size: 250% 100%;
        -webkit-mask-repeat: no-repeat;
        mask-repeat: no-repeat;
        -webkit-mask-position: 0 0;
        mask-position: 0 0;
        animation-name: ink-wipe;
        animation-timing-function: cubic-bezier(0.33, 0, 0.2, 1);
        animation-fill-mode: backwards;
    }
    @keyframes ink-wipe {
        from {
            -webkit-mask-position: 100% 0;
            mask-position: 100% 0;
        }
        to {
            -webkit-mask-position: 0 0;
            mask-position: 0 0;
        }
    }
</style>
