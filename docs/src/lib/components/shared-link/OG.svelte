<script lang="ts">
    import { OG } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'

    const {
        type = 'og',
        url,
        title,
        description,
        features
    }: {
        type: 'og' | 'twitter'
        url: string
        title?: string
        description?: string
        features?: string[]
    } = $props()
</script>

<OG {type} {url} config={docsConfig} {title} {description} {features} />
