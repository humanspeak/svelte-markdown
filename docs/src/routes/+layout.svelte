<script lang="ts">
    import '../app.css'
    import { RootLayout } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import favicon from '$lib/assets/logo.svg'
    import githubStats from '$lib/github-stats.json'

    const { children } = $props()
</script>

<RootLayout config={docsConfig} {favicon} stars={githubStats.stars}>
    {@render children?.()}
</RootLayout>
