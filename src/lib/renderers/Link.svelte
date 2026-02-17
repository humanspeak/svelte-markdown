<!--
@component
Renders a markdown link (`[text](url "title")`) as an `<a>` element.

@prop {string} [href=''] - Link destination URL.
@prop {string} [title] - Tooltip text displayed on hover.
@prop {Snippet} [children] - Rendered inline content of the link.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    interface Props {
        href?: string
        title?: string
        children?: Snippet
    }
    const { href = '', title = undefined, children }: Props = $props()
</script>

<a {href} {title}>{@render children?.()}</a>
