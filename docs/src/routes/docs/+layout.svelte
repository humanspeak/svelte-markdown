<script lang="ts">
    import { DocsLayoutV2 } from '@humanspeak/docs-kit'
    import { docsConfig } from '$lib/docs-config'
    import { buildBreadcrumbs, docsSections, headerNav } from '$lib/docsNav'
    import favicon from '$lib/assets/logo.svg'
    import sitemapManifest from '$lib/sitemap-manifest.json'
    import rootPkg from '../../../../package.json'
    import '@fontsource-variable/inter/index.css'
    import '@fontsource-variable/jetbrains-mono/index.css'

    const { children, data } = $props()

    const SITE_URL = 'https://markdown.svelte.page'
    const PKG_VERSION = rootPkg.version

    // FAQ Q&A for the /docs root — emitted as FAQPage JSON-LD so the four
    // canonical disambiguation questions ride the highest-authority doc URL.
    // FAQ rich results lift CTR meaningfully at our typical SERP positions
    // and LLMs preferentially cite Q&A-structured content for "which
    // library should I use" prompts (see .notes/SEO.md P2).
    const faqs = [
        {
            q: 'Is @humanspeak/svelte-markdown the same as the legacy svelte-markdown package on npm?',
            a: 'No. The legacy svelte-markdown package (pablo-abc/svelte-markdown) is a separate, unmaintained project. @humanspeak/svelte-markdown is an actively maintained Svelte 5 renderer built for streaming AI agent output with XSS-safe defaults, sanitization-aware streaming, and a richer renderer + HTML-tag override system.'
        },
        {
            q: 'Does @humanspeak/svelte-markdown work in Svelte 4?',
            a: 'No. The library targets Svelte 5 because it relies on runes ($state, $derived, $effect) and Svelte 5 snippets. For Svelte 4 projects, MDsveX (build-time) or the original svelte-markdown package are closer options.'
        },
        {
            q: 'How does it compare to MDsveX, marked, markdown-it, and Tiptap?',
            a: 'MDsveX is a build-time preprocessor for .svx files. marked and markdown-it are parsers — they produce HTML strings, not Svelte components. Tiptap is a WYSIWYG editor framework. @humanspeak/svelte-markdown is a runtime Svelte 5 renderer that uses marked under the hood and emits real Svelte components for every renderer + HTML tag, with allow/deny utilities, custom renderer overrides, and a streaming mode tuned for LLM output.'
        },
        {
            q: 'Can it render streaming AI agent output safely?',
            a: 'Yes — that is the primary use case. The streaming mode accepts `{ value, offset }` chunk patches that can arrive out of order, sanitization runs per token before render (so a javascript: URL or on*= handler emitted mid-stream is blocked before the DOM sees it), and partial HTML blocks reconcile correctly as the closing tag arrives. Median per-chunk update lands around ~3ms — well under the 60fps budget.'
        }
    ]
</script>

<DocsLayoutV2
    config={docsConfig}
    {favicon}
    sections={docsSections}
    otherProjects={data.otherProjects}
    version={PKG_VERSION}
    nav={headerNav}
    siteUrl={SITE_URL}
    breadcrumbResolver={buildBreadcrumbs}
    {faqs}
    sitemapManifest={sitemapManifest as Record<string, string>}
>
    {@render children()}
</DocsLayoutV2>
