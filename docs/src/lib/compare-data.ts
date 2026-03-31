export interface ComparisonFeature {
    name: string
    us: string | boolean
    them: string | boolean
    note?: string
}

export interface Competitor {
    slug: string
    name: string
    tagline: string
    description: string
    website?: string
    github?: string
    npm?: string
    type: string
    approach: string
    features: ComparisonFeature[]
    prosUs: string[]
    prosThem: string[]
    consUs: string[]
    consThem: string[]
    verdict: string
    keywords: string[]
}

const shared = {
    prosUs: [
        'Svelte 5 runes-native — no legacy compatibility layers',
        'TypeScript-first with full type safety',
        'Built-in token caching (50-200x faster re-renders)',
        'Built-in LLM streaming mode with incremental updates',
        '24 markdown renderers + 69+ HTML tag renderers',
        'Allow/deny utilities for fine-grained control',
        'Drop-in component — works anywhere in your Svelte app'
    ],
    consUs: ['Smaller community (newer project)', 'Runtime-only (no build-time optimization)']
}

export const competitors: Competitor[] = [
    {
        slug: 'vs-mdsvex',
        name: 'MDsveX',
        tagline: 'Build-Time Preprocessor vs Runtime Component',
        description:
            'MDsveX is the most popular Svelte markdown tool — a preprocessor that lets you write Svelte components inside .svx files at build time. @humanspeak/svelte-markdown renders markdown at runtime as a Svelte component.',
        website: 'https://mdsvex.pngwn.io',
        github: 'https://github.com/pngwn/MDsveX',
        npm: 'mdsvex',
        type: 'Preprocessor',
        approach: 'Build-time (.svx files)',
        features: [
            { name: 'Svelte 5 Native', us: true, them: true },
            { name: 'TypeScript Support', us: true, them: 'Partial' },
            { name: 'Runtime Rendering', us: true, them: false, note: 'MDsveX is build-time only' },
            {
                name: 'Dynamic Content',
                us: true,
                them: false,
                note: 'Cannot render user-supplied markdown'
            },
            { name: 'Custom Renderers', us: true, them: true },
            {
                name: 'Token Caching',
                us: true,
                them: false,
                note: 'Not needed — parsed at build time'
            },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'MDsveX is build-time only, so there is no runtime markdown streaming mode.'
            },
            {
                name: 'HTML Tag Control',
                us: '69+ tags with allow/deny',
                them: 'Via rehype plugins'
            },
            { name: 'Markdown in Components', us: true, them: true },
            { name: 'Components in Markdown', us: false, them: true },
            {
                name: 'Frontmatter',
                us: false,
                them: true,
                note: 'MDsveX has built-in frontmatter parsing'
            },
            {
                name: 'Code Highlighting',
                us: 'Via marked extensions',
                them: 'Built-in (Shiki/Prism)'
            },
            { name: 'Remark/Rehype Plugins', us: false, them: true }
        ],
        prosUs: [
            ...shared.prosUs,
            'Renders dynamic/user-supplied markdown at runtime',
            'No build step required — works with any markdown string',
            'Simpler mental model — just pass a string, get rendered output'
        ],
        prosThem: [
            'Largest Svelte markdown ecosystem (~2,600 GitHub stars)',
            'Build-time optimization — zero runtime parsing cost',
            'Use Svelte components directly inside markdown files',
            'Rich plugin ecosystem via unified/remark/rehype',
            'Built-in code syntax highlighting',
            'Frontmatter parsing out of the box'
        ],
        consUs: [
            ...shared.consUs,
            'Cannot embed Svelte components inside markdown content',
            'No frontmatter support (parse separately if needed)'
        ],
        consThem: [
            'Cannot render dynamic/user-supplied markdown',
            'Content must exist at build time as .svx files',
            'Adds build complexity (preprocessor configuration)',
            'Not suitable for CMS content, user input, or API-fetched markdown'
        ],
        verdict:
            'Choose MDsveX for static content sites, blogs, and documentation where markdown is known at build time. Choose @humanspeak/svelte-markdown when you need to render dynamic markdown — CMS content, user input, API responses, or any scenario where the markdown string is not known until runtime.',
        keywords: [
            'mdsvex',
            'svelte markdown',
            'mdsvex vs svelte-markdown',
            'svelte markdown preprocessor',
            'svelte markdown component'
        ]
    },
    {
        slug: 'vs-tiptap',
        name: 'Tiptap',
        tagline: 'Heavyweight Editor vs Lightweight Renderer',
        description:
            'Tiptap is a headless rich text editor built on ProseMirror with Svelte support via svelte-tiptap. @humanspeak/svelte-markdown is a focused markdown renderer — not an editor.',
        website: 'https://tiptap.dev',
        github: 'https://github.com/ueberdosis/tiptap',
        npm: '@tiptap/core',
        type: 'Rich Text Editor',
        approach: 'WYSIWYG editing (ProseMirror)',
        features: [
            { name: 'Svelte 5 Native', us: true, them: 'Via wrapper (svelte-tiptap)' },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: 'Via extension' },
            { name: 'WYSIWYG Editing', us: false, them: true },
            {
                name: 'Bundle Size',
                us: 'Lightweight (~15KB)',
                them: 'Heavy (~200KB+ with extensions)'
            },
            { name: 'Custom Renderers', us: true, them: 'Via node views' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'Tiptap can update editor state live, but it does not document a dedicated markdown streaming renderer mode.'
            },
            { name: 'HTML Tag Control', us: '69+ tags with allow/deny', them: 'Via schema' },
            { name: 'Collaborative Editing', us: false, them: true },
            { name: 'Toolbar/Menus', us: false, them: 'Headless (build your own)' },
            {
                name: 'Setup Complexity',
                us: 'Minimal — one component',
                them: 'Significant configuration'
            }
        ],
        prosUs: [
            ...shared.prosUs,
            'Fraction of the bundle size',
            'Zero configuration — just pass markdown and render',
            'Purpose-built for rendering, not editing'
        ],
        prosThem: [
            'Full WYSIWYG rich text editing experience',
            'Massive ecosystem (~35,500 GitHub stars)',
            'Collaborative editing support (Y.js)',
            'Extensible with 100+ official extensions',
            'Framework-agnostic — works beyond Svelte'
        ],
        consUs: [...shared.consUs, 'No editing capabilities', 'No collaborative features'],
        consThem: [
            'Massive bundle size for simple rendering use cases',
            'Svelte support is via community wrapper, not first-party',
            'Complex setup and configuration for basic markdown display',
            'Overkill if you just need to render markdown'
        ],
        verdict:
            'Choose Tiptap when you need a rich text editor with WYSIWYG capabilities, collaborative editing, or complex content authoring. Choose @humanspeak/svelte-markdown when you need to display markdown content — it is dramatically simpler, smaller, and faster for pure rendering.',
        keywords: [
            'tiptap svelte',
            'svelte rich text editor',
            'tiptap vs svelte-markdown',
            'svelte wysiwyg',
            'svelte-tiptap'
        ]
    },
    {
        slug: 'vs-markdown-it',
        name: 'markdown-it',
        tagline: 'Raw Parser vs Svelte Component',
        description:
            'markdown-it is a fast, pluggable markdown parser that outputs raw HTML strings. @humanspeak/svelte-markdown wraps the marked parser in a native Svelte component with renderers, caching, and HTML control.',
        website: 'https://markdown-it.github.io',
        github: 'https://github.com/markdown-it/markdown-it',
        npm: 'markdown-it',
        type: 'Markdown Parser',
        approach: 'String in, HTML string out',
        features: [
            { name: 'Svelte 5 Native', us: true, them: false },
            { name: 'TypeScript Support', us: true, them: '@types/markdown-it' },
            { name: 'Component Output', us: 'Svelte components', them: 'Raw HTML string' },
            {
                name: 'Custom Renderers',
                us: 'Svelte components',
                them: 'Token stream manipulation'
            },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'HTML Safety',
                us: 'Allow/deny per tag',
                them: 'Manual (use with {@html})'
            },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'markdown-it is a parser, not a streaming UI layer.'
            },
            { name: 'Plugin Ecosystem', us: 'Via marked extensions', them: '200+ plugins' },
            {
                name: 'CommonMark Compliance',
                us: 'Via marked (GFM)',
                them: '100% CommonMark + extensions'
            },
            {
                name: 'XSS Protection',
                us: 'Built-in tag control',
                them: 'Manual sanitization required'
            },
            {
                name: 'Framework Integration',
                us: 'Native Svelte component',
                them: 'Framework-agnostic (requires {@html})'
            }
        ],
        prosUs: [
            ...shared.prosUs,
            'Renders as Svelte components — not raw HTML injection',
            'No need for {@html} and manual sanitization',
            'Built-in XSS protection via allow/deny controls'
        ],
        prosThem: [
            'Massive ecosystem (13M+ weekly npm downloads)',
            '100% CommonMark compliant with spec test suite',
            '200+ community plugins available',
            'Framework-agnostic — use anywhere',
            'Battle-tested in production at scale'
        ],
        consUs: [...shared.consUs, 'Fewer plugins than markdown-it ecosystem'],
        consThem: [
            'Outputs raw HTML strings — requires {@html} in Svelte',
            'No built-in XSS protection — manual sanitization needed',
            'No Svelte component integration — cannot use Svelte renderers',
            'No caching layer — re-parses every render'
        ],
        verdict:
            'Choose markdown-it when you need a framework-agnostic parser with maximum CommonMark compliance and a vast plugin ecosystem. Choose @humanspeak/svelte-markdown when you want a native Svelte experience with component-based rendering, built-in safety controls, and caching.',
        keywords: [
            'markdown-it',
            'markdown-it svelte',
            'svelte markdown parser',
            'markdown-it vs marked'
        ]
    },
    {
        slug: 'vs-marked',
        name: 'marked',
        tagline: 'The Engine Under Our Hood',
        description:
            'marked is the markdown parser that powers @humanspeak/svelte-markdown. Using marked directly gives you a raw HTML string; we wrap it in a full Svelte component system with renderers, caching, and safety controls.',
        website: 'https://marked.js.org',
        github: 'https://github.com/markedjs/marked',
        npm: 'marked',
        type: 'Markdown Parser',
        approach: 'String in, HTML string out',
        features: [
            { name: 'Svelte 5 Native', us: true, them: false },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Component Output', us: 'Svelte components', them: 'Raw HTML string' },
            { name: 'Custom Renderers', us: 'Svelte components', them: 'Token manipulation' },
            { name: 'Token Caching', us: 'Built-in LRU cache', them: 'Manual implementation' },
            { name: 'HTML Safety', us: 'Allow/deny per tag', them: 'Manual sanitization' },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'marked is the parsing engine only; incremental streaming behavior must be built manually on top.'
            },
            {
                name: 'Extensions',
                us: 'Full marked extensions support',
                them: 'Full extensions API'
            },
            { name: 'GFM Support', us: true, them: true },
            {
                name: 'Bundle Size',
                us: '~15KB (includes marked)',
                them: '~8KB (parser only)'
            },
            { name: 'Framework Integration', us: 'Native Svelte', them: 'Requires {@html}' }
        ],
        prosUs: [
            ...shared.prosUs,
            'All the power of marked, wrapped in Svelte components',
            'Full marked extensions API pass-through',
            'No {@html} needed — renders as safe Svelte components'
        ],
        prosThem: [
            'Most popular JS markdown parser (21M+ weekly npm downloads)',
            'Smaller bundle (parser only, no rendering layer)',
            'Framework-agnostic — use anywhere',
            'Maximum flexibility with token/renderer hooks',
            'Extensive extension ecosystem'
        ],
        consUs: [
            ...shared.consUs,
            'Slightly larger bundle (includes rendering layer on top of marked)'
        ],
        consThem: [
            'Outputs raw HTML — requires {@html} and manual XSS handling',
            'No component-based rendering in Svelte',
            'Must manually implement caching',
            'No allow/deny controls for HTML tags'
        ],
        verdict:
            'We use marked internally — so you get all of its parsing power for free. Choose marked directly when you need a framework-agnostic parser or want the absolute smallest bundle. Choose @humanspeak/svelte-markdown when you want the Svelte DX layer: component rendering, caching, HTML controls, and TypeScript types.',
        keywords: [
            'marked js',
            'svelte markdown renderer',
            'marked svelte',
            'marked vs svelte-markdown'
        ]
    },
    {
        slug: 'vs-milkdown',
        name: 'Milkdown',
        tagline: 'Plugin-Driven Editor vs Focused Renderer',
        description:
            'Milkdown is a plugin-driven WYSIWYG markdown editor built on ProseMirror + remark. @humanspeak/svelte-markdown is a lightweight rendering component — not an editor.',
        website: 'https://milkdown.dev',
        github: 'https://github.com/Milkdown/milkdown',
        npm: '@milkdown/core',
        type: 'WYSIWYG Markdown Editor',
        approach: 'ProseMirror + remark pipeline',
        features: [
            { name: 'Svelte 5 Native', us: true, them: 'Via recipe/adapter' },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: true },
            { name: 'WYSIWYG Editing', us: false, them: true },
            { name: 'Bundle Size', us: 'Lightweight (~15KB)', them: 'Heavy (~150KB+)' },
            { name: 'Custom Renderers', us: true, them: 'Via ProseMirror nodes' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'Milkdown updates live as an editor, but it does not document a dedicated markdown streaming renderer mode.'
            },
            { name: 'Collaborative Editing', us: false, them: 'Via Y.js plugin' },
            { name: 'Slash Commands', us: false, them: true },
            { name: 'Setup Complexity', us: 'One component', them: 'Plugin assembly required' },
            { name: 'Theming', us: 'Via Svelte components', them: 'Headless (bring your own CSS)' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Dramatically smaller bundle size',
            'Zero configuration for rendering',
            'Pure rendering — no editor overhead'
        ],
        prosThem: [
            'Full WYSIWYG markdown editing experience',
            'Plugin-driven architecture (~10,700 GitHub stars)',
            'Collaborative editing via Y.js',
            'Slash commands, toolbar, and more',
            'Headless — fully customizable appearance'
        ],
        consUs: [...shared.consUs, 'No editing capabilities', 'No collaborative features'],
        consThem: [
            'Heavy bundle for display-only use cases',
            'Svelte support is via adapter, not first-party',
            'Requires significant configuration and plugin wiring',
            'ProseMirror learning curve'
        ],
        verdict:
            'Choose Milkdown when you need a beautiful, interactive markdown editing experience with collaborative features. Choose @humanspeak/svelte-markdown when you just need to display markdown — it is 10x lighter and requires zero configuration.',
        keywords: ['milkdown', 'milkdown svelte', 'svelte markdown editor', 'milkdown vs tiptap']
    },
    {
        slug: 'vs-svelte-exmarkdown',
        name: 'svelte-exmarkdown',
        tagline: 'Two Runtime Renderers, Different Engines',
        description:
            'svelte-exmarkdown is an extensible runtime markdown renderer built on unified/remark/rehype. @humanspeak/svelte-markdown is built on marked. Both render markdown as Svelte components at runtime.',
        github: 'https://github.com/ssssota/svelte-exmarkdown',
        npm: 'svelte-exmarkdown',
        type: 'Runtime Renderer',
        approach: 'unified/remark/rehype pipeline',
        features: [
            { name: 'Svelte 5 Native', us: true, them: true },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Parsing Engine', us: 'marked', them: 'unified/remark/rehype' },
            { name: 'Custom Renderers', us: true, them: true },
            { name: 'Token Caching', us: 'Built-in LRU cache', them: false },
            {
                name: 'HTML Tag Control',
                us: '69+ tags with allow/deny',
                them: 'Via rehype plugins'
            },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'svelte-exmarkdown is a runtime renderer, but its upstream docs do not describe a streaming-specific incremental mode.'
            },
            { name: 'Plugin System', us: 'Marked extensions', them: 'Remark/rehype plugins' },
            { name: 'Snippet Overrides', us: true, them: false },
            {
                name: 'HTML Renderers',
                us: '69+ dedicated components',
                them: 'Generic element handling'
            },
            { name: 'Bundle Size', us: '~15KB', them: '~25KB+ (unified stack)' },
            { name: 'Marked Extensions', us: true, them: false }
        ],
        prosUs: [
            ...shared.prosUs,
            'Svelte 5 snippet overrides — customize rendering inline',
            '69+ dedicated HTML tag renderers (not generic)',
            'Smaller bundle — marked is lighter than unified stack'
        ],
        prosThem: [
            'Built on unified ecosystem — access to hundreds of remark/rehype plugins',
            'AST-level transformation capabilities',
            'Plugin architecture designed for extensibility',
            'Active maintenance and Svelte 5 support'
        ],
        consUs: [...shared.consUs, 'No direct access to remark/rehype plugin ecosystem'],
        consThem: [
            'No built-in token caching',
            'Larger bundle (unified + remark + rehype)',
            'No snippet override support',
            'Fewer dedicated HTML tag renderers'
        ],
        verdict:
            'Choose svelte-exmarkdown if you are invested in the unified/remark/rehype ecosystem and need specific plugins from that world. Choose @humanspeak/svelte-markdown for a lighter, faster option with built-in caching, snippet overrides, and comprehensive HTML tag handling.',
        keywords: [
            'svelte exmarkdown',
            'svelte markdown component',
            'svelte-exmarkdown vs svelte-markdown'
        ]
    },
    {
        slug: 'vs-carta',
        name: 'Carta',
        tagline: 'Editor + Viewer vs Pure Renderer',
        description:
            'Carta (carta-md) is a lightweight Svelte markdown editor AND viewer powered by unified/remark/rehype. @humanspeak/svelte-markdown is a focused rendering component.',
        website: 'https://beartocode.github.io/carta',
        github: 'https://github.com/BearToCode/carta',
        npm: 'carta-md',
        type: 'Markdown Editor + Viewer',
        approach: 'Split-pane editor with live preview',
        features: [
            { name: 'Svelte 5 Native', us: true, them: true },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: true },
            { name: 'Markdown Editing', us: false, them: true },
            { name: 'Custom Renderers', us: 'Svelte components', them: 'Via plugins' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'HTML Tag Control',
                us: '69+ tags with allow/deny',
                them: 'Via rehype-sanitize'
            },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'Carta offers live preview for editing, but its docs do not describe a dedicated markdown streaming renderer mode.'
            },
            { name: 'Syntax Highlighting', us: 'Via extensions', them: 'Built-in plugin' },
            { name: 'Math (KaTeX)', us: 'Via extensions', them: 'Built-in plugin' },
            { name: 'Split-Pane UI', us: false, them: true },
            { name: 'Keyboard Shortcuts', us: false, them: true }
        ],
        prosUs: [
            ...shared.prosUs,
            'Simpler API — one component, one prop',
            'More granular HTML control (69+ individual tag renderers)',
            'Snippet overrides for inline customization'
        ],
        prosThem: [
            'Full markdown editing experience with live preview',
            'Svelte-native (not a wrapper around another framework)',
            'Lightweight compared to ProseMirror-based editors',
            'Plugin system for syntax highlighting, math, etc.',
            'Keyboard shortcuts and toolbar'
        ],
        consUs: [...shared.consUs, 'No editing capabilities', 'No split-pane UI'],
        consThem: [
            'Bundled editor code even if you only need rendering',
            'Smaller community than established editors',
            'No token caching',
            'Fewer HTML tag renderers'
        ],
        verdict:
            'Choose Carta when you need a Svelte-native markdown editor with live preview — it is the lightest editor option in the ecosystem. Choose @humanspeak/svelte-markdown when you only need rendering — simpler, lighter, with better caching and HTML control.',
        keywords: ['carta-md', 'carta svelte', 'svelte markdown editor', 'carta vs svelte-markdown']
    },
    {
        slug: 'vs-bytemd',
        name: 'ByteMD',
        tagline: 'Full Editor vs Pure Renderer',
        description:
            'ByteMD is a hackable markdown editor originally built with Svelte by ByteDance. It compiles to framework-agnostic JavaScript. @humanspeak/svelte-markdown is a focused Svelte 5 rendering component.',
        github: 'https://github.com/pd4d10/bytemd',
        npm: 'bytemd',
        type: 'Markdown Editor',
        approach: 'Split-pane editor + preview',
        features: [
            { name: 'Svelte 5 Native', us: true, them: 'Svelte 3/4 era' },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: true },
            { name: 'Markdown Editing', us: false, them: true },
            { name: 'Custom Renderers', us: true, them: 'Via plugins' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'HTML Tag Control',
                us: '69+ tags with allow/deny',
                them: 'Via sanitize schema'
            },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'ByteMD is an editor with live preview, but its upstream docs do not describe a dedicated markdown streaming renderer mode.'
            },
            {
                name: 'Plugin Ecosystem',
                us: 'Marked extensions',
                them: 'Official plugins (math, mermaid, etc.)'
            },
            { name: 'XSS Protection', us: 'Built-in', them: 'Built-in (sanitize-html)' },
            { name: 'Framework Support', us: 'Svelte 5', them: 'Svelte, React, Vue, vanilla' },
            {
                name: 'Maintenance',
                us: 'Active',
                them: 'Slowed (~4k stars but fewer recent updates)'
            }
        ],
        prosUs: [
            ...shared.prosUs,
            'Svelte 5 native — ByteMD is Svelte 3/4 era',
            'Actively maintained for latest Svelte',
            'Lighter bundle for rendering use cases'
        ],
        prosThem: [
            'Full markdown editor with split-pane preview',
            'Framework-agnostic — works in React, Vue, vanilla JS',
            'Official plugins for math, mermaid, syntax highlighting',
            'XSS-safe by default',
            'Large community (~4,000 GitHub stars)'
        ],
        consUs: [...shared.consUs, 'No editing capabilities'],
        consThem: [
            'Built on Svelte 3/4 — not updated for Svelte 5 runes',
            'Development has slowed significantly',
            'Overkill for display-only use cases',
            'Larger bundle size'
        ],
        verdict:
            'Choose ByteMD when you need a cross-framework markdown editor with built-in plugins. Choose @humanspeak/svelte-markdown when you want a modern, Svelte 5-native rendering component — ByteMD has not yet been updated for Svelte 5.',
        keywords: ['bytemd', 'bytemd svelte', 'markdown editor svelte', 'bytemd vs svelte-markdown']
    },
    {
        slug: 'vs-unified-remark',
        name: 'unified / remark',
        tagline: 'AST Pipeline vs Component Renderer',
        description:
            'unified and remark form an AST-based content processing pipeline used under the hood by MDsveX, svelte-exmarkdown, and Carta. @humanspeak/svelte-markdown uses marked for a more straightforward parse-and-render approach.',
        website: 'https://unifiedjs.com',
        github: 'https://github.com/remarkjs/remark',
        npm: 'unified',
        type: 'Content Processing Pipeline',
        approach: 'AST transformation pipeline',
        features: [
            { name: 'Svelte 5 Native', us: true, them: false },
            { name: 'TypeScript Support', us: true, them: true },
            {
                name: 'Component Output',
                us: 'Svelte components',
                them: 'HTML string (rehype-stringify)'
            },
            { name: 'Custom Renderers', us: 'Svelte components', them: 'AST transformers' },
            { name: 'Token Caching', us: true, them: 'Manual' },
            {
                name: 'Plugin Ecosystem',
                us: 'Marked extensions',
                them: '200+ remark/rehype plugins'
            },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: 'Via unified-stream',
                note: 'The unified ecosystem has a separate unified-stream package, but not a built-in Svelte markdown streaming mode.'
            },
            { name: 'AST Access', us: false, them: true },
            { name: 'Learning Curve', us: 'Minimal', them: 'Steep (AST concepts)' },
            { name: 'Bundle Size', us: '~15KB', them: '~30KB+ (unified + remark + rehype)' },
            { name: 'Setup', us: 'One component', them: 'Pipeline assembly required' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Dead simple API — no pipeline assembly',
            'Lighter bundle — no AST infrastructure',
            'Renders directly to Svelte components'
        ],
        prosThem: [
            'Massive plugin ecosystem (200+ remark/rehype plugins)',
            'Full AST access for deep content transformation',
            'Powers MDsveX, Gatsby, Next.js, and many others',
            'Framework-agnostic content pipeline',
            'Content linting, validation, and transformation'
        ],
        consUs: [
            ...shared.consUs,
            'No AST access for deep transformations',
            'Smaller plugin ecosystem than unified'
        ],
        consThem: [
            'Not a component — outputs HTML strings requiring {@html}',
            'Steep learning curve (AST, visitors, transformers)',
            'Requires pipeline assembly with multiple packages',
            'Larger bundle footprint',
            'No Svelte-specific features'
        ],
        verdict:
            'Choose unified/remark when you need deep AST transformations, content linting, or access to the massive plugin ecosystem. Choose @humanspeak/svelte-markdown for a simple, Svelte-native rendering experience that just works.',
        keywords: [
            'remark markdown',
            'unified svelte',
            'remark vs marked',
            'svelte markdown parser'
        ]
    },
    {
        slug: 'vs-prosemirror',
        name: 'ProseMirror',
        tagline: 'Editor Toolkit vs Ready-Made Renderer',
        description:
            'ProseMirror is the low-level editor framework that powers Tiptap and Milkdown. Using it directly with Svelte requires significant assembly. @humanspeak/svelte-markdown is a ready-to-use rendering component.',
        website: 'https://prosemirror.net',
        github: 'https://github.com/ProseMirror/prosemirror',
        npm: 'prosemirror-model',
        type: 'Editor Framework',
        approach: 'Low-level editor toolkit',
        features: [
            {
                name: 'Svelte 5 Native',
                us: true,
                them: 'Via adapter (@prosemirror-adapter/svelte)'
            },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: 'Via prosemirror-markdown' },
            { name: 'WYSIWYG Editing', us: false, them: true },
            { name: 'Custom Renderers', us: 'Svelte components', them: 'Node views (complex)' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'LLM Streaming Mode',
                us: true,
                them: false,
                note: 'ProseMirror updates editor state live, but it does not document a dedicated markdown streaming renderer mode.'
            },
            { name: 'Bundle Size', us: '~15KB', them: '~80KB+ (core + markdown + view)' },
            { name: 'Learning Curve', us: 'Minimal', them: 'Very steep' },
            { name: 'Collaborative Editing', us: false, them: true },
            { name: 'Setup Time', us: 'Minutes', them: 'Days to weeks' },
            { name: 'Flexibility', us: 'Rendering focused', them: 'Unlimited (build anything)' }
        ],
        prosUs: [
            ...shared.prosUs,
            'Ready to use in minutes, not days',
            'No ProseMirror expertise required',
            'Dramatically simpler mental model'
        ],
        prosThem: [
            'Build any kind of editor imaginable',
            'Industry standard for rich text editing (~7k stars)',
            'Powers Google Docs-like editing experiences',
            'Collaborative editing support',
            'Maximum control over every aspect'
        ],
        consUs: [
            ...shared.consUs,
            'No editing capabilities',
            'Less flexible than a full editor framework'
        ],
        consThem: [
            'Extremely steep learning curve',
            'Massive effort to build a basic markdown editor',
            'Svelte support is via community adapter',
            'Overkill for rendering — like using a CNC machine to cut paper',
            'Large bundle for display-only use cases'
        ],
        verdict:
            'Choose ProseMirror when you need to build a custom, production-grade editor with specific behaviors that no existing editor provides. Choose @humanspeak/svelte-markdown when you need to render markdown — it does in one component what would take weeks of ProseMirror development.',
        keywords: ['prosemirror', 'prosemirror svelte', 'svelte editor', 'prosemirror vs tiptap']
    }
]

export function getCompetitor(slug: string): Competitor | undefined {
    return competitors.find((c) => c.slug === slug)
}
