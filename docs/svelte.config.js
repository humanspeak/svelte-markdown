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
            directives: {
                'script-src': [
                    'self',
                    'https://kit.fontawesome.com',
                    'https://o4507838639243264.ingest.us.sentry.io'
                ],
                'worker-src': ['self', 'blob:']
            }
        }
    },

    extensions: ['.svelte', '.svx']
}

export default config
