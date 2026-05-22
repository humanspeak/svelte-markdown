import {
    demoManifestPlugin,
    docMirrorsPlugin,
    llmsFullPlugin,
    sitemapManifestPlugin
} from '@humanspeak/docs-kit/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

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
    //     whole library in a single context window. We skip the companion
    //     `llmsPlugin` deliberately: our `/llms.txt` is hand-curated and
    //     carries the streaming pitch + XSS-safe positioning + install
    //     snippet, which the auto-generated link table can't capture.
    plugins: [
        sitemapManifestPlugin({ blogDir: false }),
        demoManifestPlugin(),
        docMirrorsPlugin({ siteUrl: 'https://markdown.svelte.page' }),
        llmsFullPlugin({
            siteUrl: 'https://markdown.svelte.page',
            pkgName: '@humanspeak/svelte-markdown'
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
