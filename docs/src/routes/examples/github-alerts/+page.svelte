<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
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

<Example
    title="GitHub Alerts"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/GitHubAlerts.svelte"
>
    <GitHubAlerts />
</Example>
