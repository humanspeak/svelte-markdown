import type { DocsKitConfig } from '@humanspeak/docs-kit'

export const docsConfig: DocsKitConfig = {
    name: 'Svelte Markdown',
    slug: 'markdown',
    npmPackage: '@humanspeak/svelte-markdown',
    repo: 'humanspeak/svelte-markdown',
    url: 'https://markdown.svelte.page',
    description:
        'Render markdown, raw HTML, and AI streams in Svelte 5 with @humanspeak/svelte-markdown: typed renderers, token caching, and safer HTML controls.',
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
        'token-cache',
        'ai-agent',
        'llm-streaming',
        'claude-code',
        'agent-output',
        'xss-sanitization'
    ],
    defaultFeatures: [
        'Agent Output Ready',
        'LLM Streaming',
        'XSS-Safe Defaults',
        'Svelte 5 Runes',
        'TypeScript First',
        '50-200x Caching'
    ],
    fallbackStars: 400
}
