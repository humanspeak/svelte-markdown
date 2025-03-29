import adapter from '@sveltejs/adapter-cloudflare'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'
import { mdsvex } from 'mdsvex'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    preprocess: [vitePreprocess(), mdsvex()],

    kit: {
        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter: adapter(),
        csp: {
            mode: 'hash',
            directives: {
                'default-src': ['self'],
                'script-src': [
                    'self',
                    'https://kit.fontawesome.com',
                    'https://*.ingest.us.sentry.io',
                    'unsafe-inline'
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
