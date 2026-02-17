<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { page } from '$app/state'
    import { MotionConfig } from '@humanspeak/svelte-motion'
    import BreadcrumbContext from '$lib/components/contexts/Breadcrumb/BreadcrumbContext.svelte'
    import SeoContext from '$lib/components/contexts/Seo/SeoContext.svelte'
    import type { SeoContext as SeoContextType } from '$lib/components/contexts/Seo/type'

    const { children } = $props()
    const imageLocation = `${page.url.origin}/`

    // Dynamic canonical URL based on current page path
    const canonicalUrl = $derived(`${page.url.origin}${page.url.pathname}`)

    // SEO state — owned here, passed to SeoContext for child access, read directly for meta tags
    const seo = $state<SeoContextType>({
        title: 'Svelte Markdown - Customizable Markdown Renderer for Svelte 5',
        description:
            'A powerful, customizable markdown renderer for Svelte 5 with TypeScript support, 24 renderers, 69+ HTML tags, token caching, and allow/deny utilities.'
    })
</script>

<svelte:head>
    <title>{seo.title}</title>
    <meta name="description" content={seo.description} />
    <!-- Open Graph / Social Media -->
    <meta property="og:title" content={seo.title} />
    <meta property="og:description" content={seo.description} />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonicalUrl} />
    <meta property="og:image" content="{imageLocation}svelte-markdown-opengraph.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />
    <meta name="twitter:image" content="{imageLocation}svelte-markdown-twitter.png" />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="svelte, markdown, renderer, svelte-5, typescript, html, parser, marked, custom-renderers, token-cache"
    />

    <!-- Additional Meta -->
    <meta name="author" content="Humanspeak, Inc." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href={canonicalUrl} />

    <!-- JSON-LD structured data -->
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "applicationCategory": "DeveloperApplication",
            "author": {
                "@type": "Organization",
                "name": "Humanspeak, Inc.",
                "url": "https://humanspeak.com"
            },
            "description": "A powerful, customizable markdown renderer for Svelte 5 with TypeScript support, 24 renderers, 69+ HTML tags, token caching, and allow/deny utilities.",
            "downloadUrl": "https://www.npmjs.com/package/@humanspeak/svelte-markdown",
            "keywords": "svelte, markdown, renderer, svelte-5, typescript, html, parser, marked",
            "license": "MIT",
            "name": "Svelte Markdown",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "operatingSystem": "Any",
            "programmingLanguage": ["TypeScript", "JavaScript"],
            "releaseNotes": "https://github.com/humanspeak/svelte-markdown/releases",
            "requirements": "Svelte 5",
            "url": "https://markdown.svelte.page"
        }
    </script>
</svelte:head>

<ModeWatcher />
<SeoContext {seo}>
    <BreadcrumbContext>
        <MotionConfig transition={{ duration: 0.5 }}>
            {@render children?.()}
        </MotionConfig>
    </BreadcrumbContext>
</SeoContext>
