<script lang="ts">
    const tests = [
        {
            href: '/test/basic',
            name: 'Basic',
            description: 'Server & browser rendering with parsed tokens'
        },
        {
            href: '/test/accessibility',
            name: 'Accessibility',
            description: 'ARIA and semantic HTML output'
        },
        {
            href: '/test/async-extensions',
            name: 'Async Extensions',
            description: 'Marked extensions with async support'
        },
        { href: '/test/caching', name: 'Caching', description: 'Token cache behavior' },
        {
            href: '/test/custom-tags',
            name: 'Custom Tags',
            description: 'Custom HTML tag rendering'
        },
        {
            href: '/test/deep-variables',
            name: 'Deep Variables',
            description: 'Deeply nested variable reactivity'
        },
        { href: '/test/edge-cases', name: 'Edge Cases', description: 'Unusual markdown inputs' },
        {
            href: '/test/extendability',
            name: 'Extendability',
            description: 'Custom renderer components'
        },
        { href: '/test/issues', name: 'Issues', description: 'GitHub issue reproductions' },
        { href: '/test/katex', name: 'KaTeX', description: 'Math rendering with KaTeX extension' },
        {
            href: '/test/katex-snippets',
            name: 'KaTeX Snippets',
            description: 'KaTeX with Svelte 5 snippets'
        },
        {
            href: '/test/lazy-images',
            name: 'Lazy Images',
            description: 'Lazy-loaded image rendering'
        },
        {
            href: '/test/marked-extensions',
            name: 'Marked Extensions',
            description: 'Custom marked extensions'
        },
        { href: '/test/mermaid', name: 'Mermaid', description: 'Mermaid diagram rendering' },
        {
            href: '/test/mermaid-snippets',
            name: 'Mermaid Snippets',
            description: 'Mermaid with Svelte 5 snippets'
        },
        { href: '/test/performance', name: 'Performance', description: 'Large document rendering' },
        { href: '/test/reactivity', name: 'Reactivity', description: 'Reactive source updates' },
        { href: '/test/snippets', name: 'Snippets', description: 'Svelte 5 snippet renderers' },
        {
            href: '/test/snippets-precedence',
            name: 'Snippets Precedence',
            description: 'Snippet vs component renderer priority'
        },
        { href: '/test/streaming', name: 'Streaming', description: 'Simulated LLM token streaming' }
    ]
</script>

<div class="index">
    <h1>@humanspeak/svelte-markdown</h1>
    <p class="subtitle">Test Pages</p>

    <div class="grid">
        {#each tests as test (test.href)}
            <a href={test.href} class="card">
                <strong>{test.name}</strong>
                <span>{test.description}</span>
            </a>
        {/each}
    </div>
</div>

<style>
    .index {
        max-width: 900px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    h1 {
        margin: 0;
        font-size: 1.5rem;
    }

    .subtitle {
        margin: 0.25rem 0 1.5rem;
        color: #718096;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 0.75rem;
    }

    .card {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 0.75rem 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        text-decoration: none;
        color: inherit;
        transition:
            border-color 0.15s,
            box-shadow 0.15s;
    }

    .card:hover {
        border-color: #4a5568;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    }

    .card strong {
        font-size: 0.95rem;
    }

    .card span {
        font-size: 0.8rem;
        color: #718096;
    }
</style>
