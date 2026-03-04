import { sveltekit } from '@sveltejs/kit/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [tailwindcss(), sveltekit()],
    server: {
        port: 8234,
        fs: {
            allow: ['..']
        }
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
