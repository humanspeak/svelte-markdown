<script lang="ts">
    import Heading from '$lib/renderers/Heading.svelte'
    import { setMarkdownDocumentContext } from '$lib/preprocess/context.js'
    import CustomHeading from '../CustomHeading.svelte'
    import CustomLink from '../CustomLink.svelte'
    const { children } = $props()
    let custom = $state(true)
    setMarkdownDocumentContext({
        get renderers() {
            return { heading: custom ? CustomHeading : Heading, link: CustomLink }
        }
    })
</script>

<button data-testid="toggle-renderer" onclick={() => (custom = !custom)}
    >Toggle heading renderer</button
>
{@render children()}
