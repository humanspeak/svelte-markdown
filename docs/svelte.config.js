import adapter from '@sveltejs/adapter-cloudflare'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'
import { createHighlighter } from 'shiki'

// Create highlighter instance
const highlighter = await createHighlighter({
    themes: ['github-light', 'one-dark-pro'],
    langs: ['javascript', 'typescript', 'html', 'css', 'json', 'bash', 'shell']
})

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: [
        vitePreprocess(),
        mdsvex({
            extensions: ['.md', '.svx'],
            highlight: {
                highlighter: async (code, lang = 'text') => {
                    const lightHtml = highlighter.codeToHtml(code, {
                        lang,
                        theme: 'github-light'
                    })
                    const darkHtml = highlighter.codeToHtml(code, {
                        lang,
                        theme: 'one-dark-pro'
                    })

                    const encoded = Buffer.from(code).toString('base64')
                    const combinedHtml = `
                        <div class="shiki-container" data-code="${encoded}" data-lang="${lang}">
                            <div class="shiki-light">${lightHtml}</div>
                            <div class="shiki-dark">${darkHtml}</div>
                        </div>
                    `

                    return `{@html ${JSON.stringify(combinedHtml)}}`
                }
            }
        })
    ],

    kit: {
        adapter: adapter(),
        csp: {
            mode: 'hash',
            directives: {
                'default-src': ['self'],
                'script-src': [
                    'self',
                    'https://kit.fontawesome.com',
                    'https://*.ahrefs.com',
                    'unsafe-inline',
                    'wasm-unsafe-eval'
                ],
                'style-src': ['self', 'unsafe-inline', 'https://kit.fontawesome.com'],
                'img-src': ['self', 'data:', 'https:'],
                'font-src': [
                    'self',
                    'data:',
                    'https://kit.fontawesome.com',
                    'https://ka-p.fontawesome.com'
                ],
                'worker-src': ['self', 'blob:'],
                'connect-src': ['self', 'https:'],
                'frame-ancestors': ['none'],
                'form-action': ['self'],
                'base-uri': ['self'],
                'upgrade-insecure-requests': true
            }
        }
    },

    extensions: ['.svelte', '.svx']
}

export default config
