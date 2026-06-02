import {
    demoManifestPlugin,
    docMirrorsPlugin,
    llmsFullPlugin,
    llmsPlugin,
    sitemapManifestPlugin,
    socialCardsPlugin
} from '@humanspeak/docs-kit/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

import { competitors } from './src/lib/compare-data'
import { docsConfig } from './src/lib/docs-config'

export default defineConfig({
    // Three docs-kit plugins run on `buildStart` and rewatch via Vite's
    // own file watcher — no chokidar process, no package.json scripts to
    // maintain.
    //   * `demoManifestPlugin`     scans `src/lib/examples/<...>/demos/*.svelte`
    //     and writes pre-highlighted source into `src/lib/demo-manifest.json`.
    //   * `sitemapManifestPlugin`  scans `src/routes/**/+page.{svelte,svx,md}`
    //     and writes `src/lib/sitemap-manifest.json` (the input to
    //     `sitemap.xml`).
    //   * `docMirrorsPlugin`       scans `src/routes/docs/**/+page.svx`,
    //     strips Svelte scripts + component tags while preserving fenced
    //     code blocks, and emits clean Markdown to `static/docs/<slug>.md`.
    //     Served verbatim at `https://markdown.svelte.page/docs/<slug>.md`
    //     so LLM crawlers (ChatGPT, Perplexity, Claude) can cite the
    //     source the way they prefer.
    //   * `llmsFullPlugin`         concatenates every per-page mirror into
    //     `static/llms-full.txt`, served at /llms-full.txt — the surface
    //     agentic LLMs (Claude Code, Cursor) reach for when they want the
    //     whole library in a single context window.
    //   * `llmsPlugin`             emits `static/llms.txt` — the compact
    //     discovery index per the llmstxt.org convention. The `prepend` +
    //     `append` slots inline our hand-curated positioning content
    //     (`static/llms-prepend.md`: install snippet, streaming pitch,
    //     XSS-safe defaults, custom HTML tag routing example, key
    //     features, use cases; `static/llms-append.md`: external links)
    //     while the canonical-URL block and `## Documentation` link
    //     table auto-sync from the sitemap manifest so new doc pages
    //     show up without a manual edit.
    plugins: [
        sitemapManifestPlugin({
            blogDir: false,
            // The `/compare/[slug]` route is a single SvelteKit dynamic page, so
            // filesystem discovery can't see the concrete competitor slugs.
            // Inject them so each comparison lands in the sitemap manifest with
            // its own lastmod (driven by `compare-data.ts`'s mtime).
            extraPages: competitors.map((competitor) => ({
                route: `/compare/${competitor.slug}`,
                source: 'src/lib/compare-data.ts'
            }))
        }),
        demoManifestPlugin(),
        docMirrorsPlugin({ siteUrl: 'https://markdown.svelte.page' }),
        llmsFullPlugin({
            siteUrl: 'https://markdown.svelte.page',
            pkgName: '@humanspeak/svelte-markdown'
        }),
        llmsPlugin({
            siteUrl: 'https://markdown.svelte.page',
            pkgName: 'Svelte Markdown',
            description:
                'A powerful, customizable markdown and HTML renderer for Svelte 5 — built for rendering streaming AI agent output from Claude Code, ChatGPT, and agentic workflows. Built on Marked and HTMLParser2 with 24 markdown renderers, 83 HTML tag renderers, LRU token caching, allow/deny filtering, and XSS-safe defaults.',
            prepend: 'static/llms-prepend.md',
            append: 'static/llms-append.md'
        }),
        // Renders `static/og-default.png` + per-page social cards from
        // satori templates. `apply: 'build'` — dev skips it, so iterating
        // on copy doesn't pay the ~10s render cost on every save. The
        // compare pages can't be picked up by the static `seo.ogSlug =
        // '...'` regex (ComparisonPageV2 builds the slug from a prop) so
        // they're injected explicitly via `extraPages`.
        socialCardsPlugin({
            npmPackage: docsConfig.npmPackage,
            defaultTitle: docsConfig.name,
            defaultDescription:
                'Fast, secure markdown rendering with built-in caching and snippet overrides.',
            defaultFeatures: docsConfig.defaultFeatures,
            extraPages: [
                {
                    ogSlug: 'compare',
                    ogTitle: 'Compare',
                    ogTagline:
                        'Honest, side-by-side comparisons against every major Svelte markdown library you would consider.',
                    ogFeatures: [
                        'All Comparisons',
                        'Feature Matrices',
                        'Pros & Cons',
                        'Migration Guides'
                    ]
                },
                ...competitors.map((c) => ({
                    ogSlug: `compare-${c.slug}`,
                    ogTitle: `vs ${c.name}`,
                    ogTagline: c.tagline,
                    ogFeatures: [
                        'Feature Comparison',
                        'Pros & Cons',
                        'Migration Guide',
                        'Honest Verdict'
                    ]
                }))
            ]
        }),
        tailwindcss(),
        sveltekit()
    ],
    server: {
        port: 8234,
        fs: {
            allow: ['..']
        }
    },
    // docs-kit ships .svelte source (not pre-compiled JS) so vite-plugin-svelte
    // can run on its components and emit scoped styles. If vite pre-bundles
    // the package via optimizeDeps the scoped <style> blocks get stripped and
    // every dk-* class falls back to unstyled `display: block` — the header
    // collapses, the footer collapses, etc.
    //
    // The transitive deps with .node bindings (satori → @resvg/resvg-js)
    // must also stay out of optimizeDeps because rolldown (vite 8's
    // bundler) can't process native modules.
    optimizeDeps: {
        exclude: [
            '@humanspeak/docs-kit',
            '@humanspeak/svelte-satori-fix',
            '@resvg/resvg-js',
            'satori',
            'satori-html'
        ]
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    // Isolate heavy dependencies into their own chunks so they
                    // only load on the pages that actually need them.
                    if (id.includes('node_modules/prettier')) {
                        return 'prettier'
                    }
                    if (id.includes('node_modules/mermaid')) {
                        return 'mermaid'
                    }
                    if (id.includes('node_modules/shiki')) {
                        return 'shiki'
                    }
                    if (id.includes('node_modules/katex')) {
                        return 'katex'
                    }
                    if (id.includes('node_modules/marked-code-format')) {
                        return 'marked-code-format'
                    }
                    if (id.includes('node_modules/@humanspeak/svelte-motion')) {
                        return 'svelte-motion'
                    }
                }
            }
        }
    }
})
