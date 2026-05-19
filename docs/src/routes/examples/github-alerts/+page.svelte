<script lang="ts">
    import { ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import GitHubAlerts from '$lib/examples/GitHubAlerts.svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'GitHub Alerts | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of GitHub-style alerts (NOTE, TIP, IMPORTANT, WARNING, CAUTION) in @humanspeak/svelte-markdown using the built-in markedAlert extension.'
        seo.ogTitle = 'GitHub Alerts'
        seo.ogTagline = 'GitHub-style admonitions in markdown.'
        seo.ogFeatures = ['5 Alert Types', 'CSS Classes', 'Built-in Extension', 'Themeable']
        seo.ogSlug = 'examples-github-alerts'
    }
</script>

<ExampleV2
    figId="FIG-001"
    tag="EXTENSIONS"
    title={{ prefix: 'github ', accent: 'alerts', end: '.' }}
    description="GitHub-style admonitions — NOTE, TIP, IMPORTANT, WARNING, CAUTION — via markedAlert with themeable CSS hooks."
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/GitHubAlerts.svelte"
>
    <GitHubAlerts />
</ExampleV2>
