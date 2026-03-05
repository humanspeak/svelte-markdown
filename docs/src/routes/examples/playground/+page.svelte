<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import MarkdownPlayground from '$lib/examples/MarkdownPlayground.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Live Playground | Examples | Svelte Markdown'
        seo.description =
            'Interactive markdown playground with live preview. Edit markdown and HTML in real-time, powered by @humanspeak/svelte-markdown.'
        seo.ogTitle = 'Live Playground'
        seo.ogTagline = 'Edit markdown and HTML with real-time preview.'
        seo.ogFeatures = ['Edit & Preview', 'Real-Time', 'Markdown + HTML', 'Full Editor']
        seo.ogSlug = 'examples-playground'
    }
</script>

<Example
    title="Live Playground"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/MarkdownPlayground.svelte"
>
    <MarkdownPlayground />
</Example>
