<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import CustomRenderers from '$lib/examples/CustomRenderers.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Custom Renderers | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of custom renderer overrides in @humanspeak/svelte-markdown. See how to control which markdown elements render.'
        seo.ogTitle = 'Custom Renderers'
        seo.ogTagline = 'Interactive demo of renderer overrides.'
        seo.ogFeatures = ['Live Demo', 'Override Props', 'Component Swap', 'See Results']
        seo.ogSlug = 'examples-custom-renderers'
    }
</script>

<ExampleV2
    figId="FIG-001"
    tag="RENDERERS"
    title={{ prefix: 'custom ', accent: 'renderers', end: '.' }}
    description="Override default renderers and choose exactly which markdown elements render — via component props or allow-list helpers."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/CustomRenderers.svelte"
>
    <CustomRenderers />
</ExampleV2>
