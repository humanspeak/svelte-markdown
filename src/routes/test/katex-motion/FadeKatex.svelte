<!--
@component
KatexRenderer that fades in when it mounts, so math arriving mid-stream eases in
next to animated text instead of snapping into place. Pass the same `enabled`
flag as the text motion preset; when it is false the math renders instantly.
-->
<script lang="ts">
    import { untrack } from 'svelte'
    import { KatexRenderer } from '$lib/extensions/katex/index.js'

    const {
        text,
        displayMode = false,
        enabled = true
    }: { text: string; displayMode?: boolean; enabled?: boolean } = $props()
    // Decided at mount: turning motion back on must not replay math already on screen.
    const fade = untrack(() => enabled)
</script>

{#if displayMode}
    <div class:fade><KatexRenderer {text} {displayMode} /></div>
{:else}
    <span class:fade><KatexRenderer {text} {displayMode} /></span>
{/if}

<style>
    .fade {
        animation: fade-in 0.5s ease-out both;
    }
    @keyframes fade-in {
        from {
            opacity: 0;
            filter: blur(2px);
        }
    }
    @media (prefers-reduced-motion: reduce) {
        .fade {
            animation: none;
        }
    }
</style>
