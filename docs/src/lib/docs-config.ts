import type { DocsKitConfig } from '@humanspeak/docs-kit'

export const docsConfig: DocsKitConfig = {
    name: 'Svelte Markdown',
    slug: 'markdown',
    npmPackage: '@humanspeak/svelte-markdown',
    repo: 'humanspeak/svelte-markdown',
    url: 'https://markdown.svelte.page',
    description:
        'A powerful, customizable markdown and HTML renderer for Svelte 5 — built for rendering streaming AI agent output from Claude Code, ChatGPT, and agentic workflows. TypeScript-first, 24 renderers, 69+ HTML tags, token caching, XSS-safe defaults, and allow/deny utilities.',
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
