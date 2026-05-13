import adapter from '@sveltejs/adapter-auto'
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/kit').Config} */
const config = {
    // Consult https://svelte.dev/docs/kit/integrations
    // for more information about preprocessors
    preprocess: vitePreprocess(),

    kit: {
        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter: adapter(),
        paths: {
            // SvelteKit 2 defaults to `relative: true`, which renders asset
            // URLs as `../_app/...`. The playwright e2e suite navigates to
            // `/test/<route>` pages — relative resolution becomes
            // `/test/_app/...`, which 404s on the preview server. Force
            // absolute paths so assets are served from `/_app/...`.
            relative: false
        }
    }
}

export default config
