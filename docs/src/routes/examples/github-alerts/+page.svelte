<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import GitHubAlerts from '$lib/examples/GitHubAlerts.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'GitHub Alerts' }
            ]
        }
    })

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
