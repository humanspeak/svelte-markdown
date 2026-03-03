<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { MotionConfig } from '@humanspeak/svelte-motion'
    import {
        BreadcrumbContextProvider,
        BreadcrumbJsonLd,
        SeoContextProvider,
        SeoHead,
        type SeoContext
    } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import githubStats from '$lib/github-stats.json'
    const { children } = $props()

    // SEO state — owned here, passed to SeoContextProvider for child access
    const seo = $state<SeoContext>({
        title: `${docsConfig.name} - Customizable Markdown Renderer for Svelte 5`,
        description: docsConfig.description
    })

    const npmUrl = `https://www.npmjs.com/package/${docsConfig.npmPackage}`
    const repoUrl = `https://github.com/${docsConfig.repo}`

    const softwareAppJsonLd =
        '<script type="application/ld+json">' +
        JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: docsConfig.name,
            description: docsConfig.description,
            url: docsConfig.url,
            downloadUrl: npmUrl,
            applicationCategory: 'DeveloperApplication',
            operatingSystem: 'Any',
            softwareRequirements: 'Svelte 5',
            license: 'https://opensource.org/licenses/MIT',
            keywords: docsConfig.keywords,
            releaseNotes: `${repoUrl}/releases`,
            author: {
                '@type': 'Organization',
                name: 'Humanspeak, Inc.',
                url: 'https://humanspeak.com',
                sameAs: ['https://github.com/humanspeak', npmUrl, repoUrl]
            },
            offers: {
                '@type': 'Offer',
                price: '0',
                priceCurrency: 'USD'
            },
            aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '5',
                ratingCount: String(githubStats.stars),
                bestRating: '5'
            }
        }) +
        '<' +
        '/script>'
</script>

<svelte:head>
    <!-- JSON-LD structured data: SoftwareApplication -->
    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
    {@html softwareAppJsonLd}
</svelte:head>

<ModeWatcher />
<SeoContextProvider {seo}>
    <SeoHead {seo} config={docsConfig} />
    <BreadcrumbContextProvider>
        <BreadcrumbJsonLd config={docsConfig} />
        <MotionConfig transition={{ duration: 0.5 }}>
            {@render children?.()}
        </MotionConfig>
    </BreadcrumbContextProvider>
</SeoContextProvider>
