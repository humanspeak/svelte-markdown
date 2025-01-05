<script lang="ts">
    import '../app.css'
    import { ModeWatcher } from 'mode-watcher'
    import { page } from '$app/state'

    const { children } = $props()
    const imageLocation = `${page.url.origin}/`
</script>

<svelte:head>
    <title>Svelte Markdown - High Performance Markdown Parser for Svelte 5</title>
    <meta
        name="description"
        content="A powerful, customizable markdown parser for Svelte 5 with TypeScript support. Features include custom renderers, HTML parsing, GitHub-style slugs, and extensive testing coverage."
    />

    <!-- Open Graph / Social Media -->
    <meta property="og:title" content="Svelte Markdown - Modern Markdown Parser for Svelte" />
    <meta
        property="og:description"
        content="Transform markdown into Svelte components with support for custom renderers, HTML parsing, and TypeScript. Perfect for documentation, blogs, and content-rich applications."
    />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://markdown.svelte.page" />
    <meta property="og:image" content="{imageLocation}svelte-markdown-opengraph.png" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Svelte Markdown - TypeScript-Ready Parser" />
    <meta
        name="twitter:description"
        content="Build better documentation and content-rich applications with this modern Markdown parser for Svelte 5"
    />
    <meta name="twitter:image" content="{imageLocation}svelte-markdown-twitter.png" />

    <!-- Keywords -->
    <meta
        name="keywords"
        content="svelte, markdown, parser, typescript, svelte5, documentation, html, converter, marked, github-slugger, component, sveltekit, formatting, content management"
    />

    <!-- Additional Meta -->
    <meta name="author" content="Humanspeak, Inc." />
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://markdown.svelte.page" />

    <!-- JSON-LD structured data -->
    <script type="application/ld+json">
        {
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Svelte Markdown",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Any",
            "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
            },
            "author": {
                "@type": "Organization",
                "name": "Humanspeak, Inc.",
                "url": "https://humanspeak.com"
            },
            "programmingLanguage": ["Svelte", "TypeScript"],
            "description": "A powerful markdown parser for Svelte 5 that transforms markdown into customizable Svelte components with TypeScript support and extensive testing coverage.",
            "license": "MIT",
            "url": "https://markdown.svelte.page",
            "downloadUrl": "https://www.npmjs.com/package/@humanspeak/svelte-markdown",
            "requirements": "Svelte 5.0 or higher",
            "releaseNotes": "https://github.com/humanspeak/svelte-markdown/releases",
            "keywords": "svelte, markdown, parser, typescript, documentation"
        }
    </script>
</svelte:head>
<ModeWatcher />

{@render children?.()}
