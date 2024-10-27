<script lang="ts">
    import { Snippet } from 'svelte'

    /**
     * @typedef {Object} Props
     * @property {string} [text]
     * @property {string} [raw]
     * @property {Snippet} [children]
     */

    /** @type {Props} */
    let {
        text,
        raw,
        children
    }: {
        text: string
        raw: string
        children: Snippet
    } = $props()
    console.log(text, raw, children)
</script>

{@render children?.()}
