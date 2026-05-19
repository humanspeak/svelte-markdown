import { demoManifestPlugin, sitemapManifestPlugin } from '@humanspeak/docs-kit/vite'
import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
    // Both manifest plugins emit JSON into `src/lib/`:
    //   * `demoManifestPlugin`     scans `src/lib/examples/<...>/demos/*.svelte`
    //     and writes pre-highlighted source into `demo-manifest.json`.
    //   * `sitemapManifestPlugin`  scans `src/routes/**/+page.{svelte,svx,md}`
    //     and writes `sitemap-manifest.json` (the input to `sitemap.xml`).
    // Both run on `buildStart` and rewatch via Vite's own file watcher —
    // no chokidar process, no package.json scripts to maintain.
    plugins: [
        sitemapManifestPlugin({ blogDir: false }),
        demoManifestPlugin(),
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
