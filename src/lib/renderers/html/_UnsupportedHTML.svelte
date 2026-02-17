<!--
@component
Placeholder component rendered for blocked HTML tags. Displays the tag and content as escaped text.
-->
<script lang="ts">
    import type { Snippet } from 'svelte'

    const {
        children,
        tag,
        attributes
    }: { children?: Snippet; tag: string; attributes?: Record<string, string> } = $props()

    const attributesString =
        Object.entries(attributes || {})
            .map(([key, value]) => `${key}="${value}"`)
            .join(' ') || ''
</script>

&lt;{tag}{attributesString ? ` ${attributesString}` : ''}&gt;{@render children?.()}&lt;/{tag}&gt;
