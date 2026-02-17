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
        title: 'Memory Cache - High-Performance In-Memory Caching for TypeScript',
        description:
            'A lightweight, zero-dependency in-memory cache for TypeScript with TTL expiration, LRU eviction, and @cached decorator for method-level memoization.'
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
    <meta property="og:image" content="{imageLocation}memory-cache-opengraph.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={seo.title} />
    <meta name="twitter:description" content={seo.description} />
    <meta name="twitter:image" content="{imageLocation}memory-cache-twitter.png" />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="cache, memory-cache, lru-cache, ttl-cache, typescript, memoization, decorator, in-memory, caching, performance, node.js, javascript"
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
            "description": "A high-performance, in-memory caching library for TypeScript with TTL expiration, LRU eviction, and a powerful @cached decorator for automatic method memoization.",
            "downloadUrl": "https://www.npmjs.com/package/@humanspeak/memory-cache",
            "keywords": "cache, memory-cache, typescript, memoization, lru, ttl",
            "license": "MIT",
            "name": "Memory Cache",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "operatingSystem": "Any",
            "programmingLanguage": ["TypeScript", "JavaScript"],
            "releaseNotes": "https://github.com/humanspeak/memory-cache/releases",
            "requirements": "Node.js 18+ or modern browser",
            "url": "https://memory.svelte.page"
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
