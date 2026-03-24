import type { Breadcrumb, NavSection } from '@humanspeak/docs-kit'
import { SiHtml5 } from '@icons-pack/svelte-simple-icons'
import {
    ArrowRightLeft,
    BookOpen,
    Box,
    Code,
    FileText,
    Filter,
    Gauge,
    Link,
    List,
    Lock,
    Paintbrush,
    Play,
    Puzzle,
    Rocket,
    Scissors,
    Settings,
    Shield,
    SquarePen,
    Superscript,
    Swords,
    TextCursor,
    TriangleAlert,
    Workflow,
    Zap
} from '@lucide/svelte'

const sectionBreadcrumbOverrides: Record<string, string> = {
    'API Reference': 'API'
}

const itemBreadcrumbOverrides: Record<string, string> = {
    '/docs/migration': 'Migration',
    '/docs/examples': 'Examples',
    '/docs/renderers/markdown-renderers': 'Markdown',
    '/docs/renderers/html-renderers': 'HTML',
    '/docs/renderers/custom-renderers': 'Custom',
    '/docs/renderers/snippet-overrides': 'Snippets'
}

export function buildBreadcrumbs(pathname: string): Breadcrumb[] {
    if (pathname === '/docs') return [{ title: 'Docs' }]
    if (pathname === '/examples') return [{ title: 'Examples' }]
    if (pathname === '/compare') return [{ title: 'Compare' }]

    for (const section of docsSections) {
        for (const item of section.items) {
            if (item.href !== pathname) continue
            const itemTitle = itemBreadcrumbOverrides[pathname] ?? item.title

            if (pathname.startsWith('/compare/')) {
                return [{ title: 'Compare', href: '/compare' }, { title: itemTitle }]
            }

            if (pathname.startsWith('/examples/')) {
                return [{ title: 'Examples', href: '/examples' }, { title: itemTitle }]
            }

            if (pathname.startsWith('/docs/')) {
                const depth = pathname.replace('/docs/', '').split('/').length
                if (depth === 1) {
                    return [{ title: 'Docs', href: '/docs/getting-started' }, { title: itemTitle }]
                }
                const sectionTitle = sectionBreadcrumbOverrides[section.title] ?? section.title
                return [
                    { title: 'Docs', href: '/docs/getting-started' },
                    { title: sectionTitle },
                    { title: itemTitle }
                ]
            }
        }
    }

    return [{ title: 'Docs' }]
}

export const docsSections: NavSection[] = [
    {
        title: 'Get Started',
        icon: Rocket,
        items: [
            { title: 'Getting Started', href: '/docs/getting-started', icon: Rocket },
            { title: 'Migration Guide', href: '/docs/migration', icon: ArrowRightLeft }
        ]
    },
    {
        title: 'API Reference',
        icon: BookOpen,
        items: [
            { title: 'SvelteMarkdown', href: '/docs/api/svelte-markdown', icon: Box },
            { title: 'Types & Exports', href: '/docs/api/types', icon: Code }
        ]
    },
    {
        title: 'Renderers',
        icon: Paintbrush,
        items: [
            { title: 'Markdown Renderers', href: '/docs/renderers/markdown-renderers', icon: List },
            { title: 'HTML Renderers', href: '/docs/renderers/html-renderers', icon: SiHtml5 },
            {
                title: 'Custom Renderers',
                href: '/docs/renderers/custom-renderers',
                icon: Paintbrush
            },
            {
                title: 'Snippet Overrides',
                href: '/docs/renderers/snippet-overrides',
                icon: Scissors
            }
        ]
    },
    {
        title: 'Advanced',
        icon: Settings,
        items: [
            { title: 'Token Caching', href: '/docs/advanced/token-caching', icon: Zap },
            { title: 'Allow/Deny', href: '/docs/advanced/allow-deny', icon: Shield },
            { title: 'Security', href: '/docs/advanced/security', icon: Lock },
            { title: 'Marked Extensions', href: '/docs/advanced/marked-extensions', icon: Puzzle },
            { title: 'LLM Streaming', href: '/docs/advanced/llm-streaming', icon: Zap }
        ]
    },
    {
        title: 'Examples',
        icon: Code,
        items: [
            { title: 'Overview', href: '/docs/examples', icon: Code },
            { title: 'Basic Rendering', href: '/docs/examples/basic-rendering', icon: FileText },
            {
                title: 'Custom Renderers',
                href: '/docs/examples/custom-renderers',
                icon: Paintbrush
            },
            {
                title: 'Snippet Overrides',
                href: '/docs/examples/snippet-overrides',
                icon: Scissors
            },
            { title: 'HTML Filtering', href: '/docs/examples/html-filtering', icon: Filter },
            {
                title: 'Inline Rendering',
                href: '/docs/examples/inline-rendering',
                icon: TextCursor
            },
            { title: 'Parsed Callback', href: '/docs/examples/parsed-callback', icon: Workflow },
            { title: 'Linked Headings', href: '/docs/examples/linked-headings', icon: Link }
        ]
    },
    {
        title: 'Interactive Demos',
        icon: Play,
        items: [
            { title: 'All Examples', href: '/examples', icon: Play },
            { title: 'Live Playground', href: '/examples/playground', icon: SquarePen },
            { title: 'Custom Renderers', href: '/examples/custom-renderers', icon: Paintbrush },
            { title: 'Snippet Overrides', href: '/examples/snippet-overrides', icon: Scissors },
            { title: 'HTML Filtering', href: '/examples/html-filtering', icon: Filter },
            { title: 'Caching Performance', href: '/examples/caching-performance', icon: Gauge },
            { title: 'Marked Extensions', href: '/examples/marked-extensions', icon: Puzzle },
            { title: 'Mermaid Diagrams', href: '/examples/mermaid', icon: Workflow },
            { title: 'GitHub Alerts', href: '/examples/github-alerts', icon: TriangleAlert },
            { title: 'Footnotes', href: '/examples/footnotes', icon: Superscript },
            { title: 'Code Formatting', href: '/examples/code-formatting', icon: Code },
            { title: 'Linked Headings', href: '/examples/linked-headings', icon: Link },
            { title: 'LLM Streaming', href: '/examples/llm-streaming', icon: Zap }
        ]
    },
    {
        title: 'Compare',
        icon: Swords,
        items: [
            { title: 'All Comparisons', href: '/compare', icon: Swords },
            { title: 'vs MDsveX', href: '/compare/vs-mdsvex', icon: Swords },
            { title: 'vs Tiptap', href: '/compare/vs-tiptap', icon: Swords },
            { title: 'vs markdown-it', href: '/compare/vs-markdown-it', icon: Swords },
            { title: 'vs marked', href: '/compare/vs-marked', icon: Swords },
            { title: 'vs Milkdown', href: '/compare/vs-milkdown', icon: Swords },
            { title: 'vs svelte-exmarkdown', href: '/compare/vs-svelte-exmarkdown', icon: Swords },
            { title: 'vs Carta', href: '/compare/vs-carta', icon: Swords },
            { title: 'vs ByteMD', href: '/compare/vs-bytemd', icon: Swords },
            { title: 'vs unified/remark', href: '/compare/vs-unified-remark', icon: Swords },
            { title: 'vs ProseMirror', href: '/compare/vs-prosemirror', icon: Swords }
        ]
    }
]
