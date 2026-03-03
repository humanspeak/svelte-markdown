import type { DocsKitConfig } from '@humanspeak/docs-kit'

export const docsConfig: DocsKitConfig = {
    name: 'Svelte Markdown',
    slug: 'markdown',
    npmPackage: '@humanspeak/svelte-markdown',
    repo: 'humanspeak/svelte-markdown',
    url: 'https://markdown.svelte.page',
    description:
        'A powerful, customizable markdown renderer for Svelte 5 with TypeScript support, 24 renderers, 69+ HTML tags, token caching, and allow/deny utilities.',
    keywords: [
        'svelte',
        'markdown',
        'renderer',
        'svelte-5',
        'typescript',
        'html',
        'parser',
        'marked',
        'custom-renderers',
        'token-cache'
    ],
    defaultFeatures: ['Svelte 5 Runes', 'TypeScript First', '50-200x Caching', 'Marked Extensions'],
    fallbackStars: 400
}
