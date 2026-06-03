<script lang="ts">
    import { BrutIndexV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import rootPkg from '../../../../package.json'

    const PKG_NAME = rootPkg.name

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Interactive Examples | Svelte Markdown'
        seo.description =
            'Live demos of @humanspeak/svelte-markdown: agent / LLM streaming, HTML filtering, custom renderers, token caching, KaTeX math, Mermaid diagrams, and more.'
        seo.ogTitle = 'Interactive Examples'
        seo.ogTagline = 'Live demos including agent / LLM streaming output.'
        seo.ogFeatures = ['Agent Streaming', 'Live Editors', 'HTML Filtering', 'Source Code']
        seo.ogSlug = 'examples'
    }

    type ExampleTag =
        | 'DEMO'
        | 'RENDERERS'
        | 'SECURITY'
        | 'PERFORMANCE'
        | 'EXTENSIONS'
        | 'SNIPPETS'
        | 'STREAMING'

    type Example = {
        slug: string
        title: string
        tag: ExampleTag
        description: string
    }

    const examples: Example[] = [
        {
            slug: 'playground',
            title: 'Live Playground',
            tag: 'DEMO',
            description:
                'Edit markdown in real-time and see it rendered instantly. Mix markdown with HTML tags.'
        },
        {
            slug: 'custom-renderers',
            title: 'Custom Renderers',
            tag: 'RENDERERS',
            description:
                'Override default renderers and control which markdown elements are rendered.'
        },
        {
            slug: 'html-filtering',
            title: 'HTML Filtering',
            tag: 'SECURITY',
            description: 'Interactive demo of allow/deny controls for HTML tags within markdown.'
        },
        {
            slug: 'caching-performance',
            title: 'Caching Performance',
            tag: 'PERFORMANCE',
            description:
                'Explore token caching and see the performance improvement on repeated renders.'
        },
        {
            slug: 'marked-extensions',
            title: 'Marked Extensions',
            tag: 'EXTENSIONS',
            description:
                'Live KaTeX math with the extensions prop. Try component renderers and snippet overrides.'
        },
        {
            slug: 'reactive-extensions',
            title: 'Reactive Extensions',
            tag: 'EXTENSIONS',
            description:
                'Dynamically rebuild marked extensions from Svelte state without appending duplicate extensions.'
        },
        {
            slug: 'mermaid',
            title: 'Mermaid Diagrams',
            tag: 'EXTENSIONS',
            description:
                'Async Mermaid diagram rendering with a custom marked extension. Flowcharts, sequence diagrams, and more.'
        },
        {
            slug: 'github-alerts',
            title: 'GitHub Alerts',
            tag: 'EXTENSIONS',
            description:
                'GitHub-style alert admonitions (NOTE, TIP, IMPORTANT, WARNING, CAUTION) with markedAlert.'
        },
        {
            slug: 'footnotes',
            title: 'Footnotes',
            tag: 'EXTENSIONS',
            description:
                'Footnote references and definitions with bidirectional linking using markedFootnote.'
        },
        {
            slug: 'code-formatting',
            title: 'Code Formatting',
            tag: 'EXTENSIONS',
            description:
                'Enhance code blocks with walkTokens extensions and snippet overrides — no custom renderers required.'
        },
        {
            slug: 'snippet-overrides',
            title: 'Snippet Overrides',
            tag: 'SNIPPETS',
            description:
                'Customize rendering inline with Svelte 5 snippets. No separate component files needed.'
        },
        {
            slug: 'linked-headings',
            title: 'Linked Headings',
            tag: 'SNIPPETS',
            description:
                'Add clickable anchor links to headings with snippet overrides or custom renderers.'
        },
        {
            slug: 'llm-streaming',
            title: 'LLM Streaming',
            tag: 'STREAMING',
            description:
                'Stream markdown and rich HTML from AI agents in real time. Adjustable speed, jitter, and chunk modes — XSS-safe by default.'
        },
        {
            slug: 'agent-output',
            title: 'Agent Output',
            tag: 'STREAMING',
            description:
                'Watch a simulated agent stream mixed markdown and HTML — with a live log of every javascript: URL and on*= handler the sanitizer blocks.'
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')

    const items = examples.map((e, i) => ({
        href: `/examples/${e.slug}`,
        id: `№ ${pad2(i + 1)} / ${pad2(examples.length)}`,
        title: `${e.title.toLowerCase()}.`,
        tag: e.tag,
        line: e.description
    }))
</script>

<BrutIndexV2
    hero={{
        figLabel: 'FIG-001 · EXAMPLES INDEX',
        figId: 'FIG-001',
        sheetLabel: 'SHEET 01 / 02',
        meta: [
            { k: 'demos', v: String(examples.length) },
            { k: 'format', v: 'live editors' },
            { k: 'tone', v: 'interactive' },
            { rule: 'dashed' },
            { k: 'library', v: PKG_NAME },
            { k: 'framework', v: 'svelte 5', accent: true }
        ],
        metaFooter: '// scroll for demos',
        kicker: '// examples / live demos',
        title: { accent: 'examples', end: '.' },
        subHtml:
            'Hands-on demos of <b>@humanspeak/svelte-markdown</b> — live editors, agent / LLM streaming, HTML filtering, custom renderers, token caching, KaTeX, Mermaid, and more. Edit, copy, ship.',
        ctas: [
            { label: 'open playground ↗', href: '/examples/playground', primary: true },
            { label: 'get started', href: '/docs/getting-started' },
            { label: 'compare', href: '/compare' }
        ]
    }}
    lede={{
        kicker: 'FIG-002 / DEMOS',
        title: { prefix: 'pick a ', accent: 'demo', suffix: '.' },
        body: 'Each page is a self-contained live example with the source you need to copy into your own project.'
    }}
    {items}
    footer={{
        big: {
            prefix: 'try ',
            accent: 'the playground',
            href: '/examples/playground',
            hint: 'edit markdown live'
        }
    }}
/>
