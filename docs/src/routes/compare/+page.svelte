<script lang="ts">
    import { CompareIndexV2 } from '@humanspeak/docs-kit'
    import { competitors, ours } from '$lib/compare-data'
</script>

<CompareIndexV2
    {competitors}
    {ours}
    introHtml="Honest, side-by-side comparisons of <b>@humanspeak/svelte-markdown</b> against every major Svelte markdown library you’d consider — including <b>MDsveX</b>, <b>Tiptap</b>, <b>markdown-it</b>, <b>marked</b>, <b>Milkdown</b>, and more. Feature matrices, pros / cons, verdicts. No spin."
/>
