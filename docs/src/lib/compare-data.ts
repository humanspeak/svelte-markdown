import type { ComparisonOurs, Competitor } from '@humanspeak/docs-kit'

export type { ComparisonFeature, ComparisonOurs, Competitor } from '@humanspeak/docs-kit'

/**
 * Brand identity passed to `CompareIndexV2` + `ComparisonPageV2` on
 * every compare route. Keeping the literal here (not at each call site)
 * means changing the canonical URL once updates the index page, every
 * /compare/<slug> page, and the JSON-LD inside them.
 */
export const ours: ComparisonOurs = {
    name: 'Svelte Markdown',
    npmPackage: '@humanspeak/svelte-markdown',
    slug: 'svelte-markdown',
    url: 'https://markdown.svelte.page'
}

const shared = {
    prosUs: [
        'Svelte 5 runes-native — built for runes, not retrofitted',
        'TypeScript-first with full type safety',
        'Built-in token caching (50-200x faster re-renders on repeated content)',
        'LLM streaming with imperative writeChunk() / resetStream() API',
        '24 markdown renderers + 83 HTML tag renderers — every override is a Svelte snippet',
        'First-class extensions: KaTeX math, Mermaid diagrams, GitHub alerts, footnotes',
        'Opt-in Shiki syntax highlighting (streaming-compatible, tree-shaken from core)',
        'Built-in XSS protection — protocol allowlist, event-handler stripping, attribute sanitization',
        'Allow/deny utilities (allowHtmlOnly, excludeRenderersOnly, etc.) for fine-grained control',
        'Drop-in component — works anywhere in your Svelte app'
    ],
    consUs: ['Smaller community (newer project)', 'Runtime-only (no build-time optimization)']
}

export const competitors: Competitor[] = [
    {
        slug: 'vs-svelte-streamdown',
        name: 'Svelte Streamdown',
        tagline: 'Two Svelte 5 Renderers Built for AI Streaming',
        description:
            'Compare svelte-streamdown and @humanspeak/svelte-markdown: two Svelte 5 markdown renderers for streaming AI output, with different approaches to styling, caching, HTML, MDX, and rich content.',
        website: 'https://svelte-streamdown.beynar.workers.dev',
        github: 'https://github.com/beynar/svelte-streamdown',
        npm: 'svelte-streamdown',
        type: 'Streaming Markdown Renderer',
        approach: 'Reactive content prop with cached block splitting and block-level reuse',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: true },
            { name: 'TypeScript Support', us: true, them: true },
            {
                name: 'Streaming API',
                us: 'Reactive source or direct writeChunk() ingestion',
                them: 'Reactive complete-content prop',
                note: 'Svelte Markdown can consume transport deltas directly. With Svelte Streamdown, the application maintains and repeatedly supplies the accumulated content string.'
            },
            {
                name: 'Out-of-Order Chunk Delivery',
                us: 'Native offset-addressed chunk assembly',
                them: false,
                note: 'Svelte Markdown accepts writeChunk({ value, offset }) and assembles websocket-style chunks even when they arrive out of order. Svelte Streamdown accepts a complete content string, so callers must order and assemble chunks before updating the prop.'
            },
            {
                name: 'Mid-Stream Corrections',
                us: 'Offset writes can replace earlier ranges',
                them: 'Caller rebuilds the content string',
                note: 'Offset-addressed writes support retransmission, transcription correction, and edits to previously received output without requiring callers to reconstruct the complete document first.'
            },
            {
                name: 'Stream Lifecycle Isolation',
                us: 'resetStream() + streamId',
                them: 'Caller-managed content state',
                note: 'Svelte Markdown provides synchronous resetStream() and declarative streamId boundaries to prevent content from one response carrying into the next.'
            },
            {
                name: 'Incomplete Markdown',
                us: true,
                them: true,
                note: 'Both projects are designed to keep partial AI output renderable while new content arrives.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: 'Incomplete blocks handled',
                note: 'Svelte Markdown explicitly tracks incomplete raw HTML tails; Svelte Streamdown documents graceful handling for incomplete markdown and MDX blocks.'
            },
            {
                name: 'Repeated Document Cache',
                us: 'Built-in configurable LRU + TTL',
                them: false,
                note: 'Svelte Streamdown caches block splitting and uses Svelte reactivity to reuse unchanged mounted blocks, but does not provide a reusable LRU for completed documents that are revisited or remounted.'
            },
            {
                name: 'Append-Only Stream Reuse',
                us: 'Tail-window parser + frame coalescing',
                them: 'Cached block splitting + reactive block reuse',
                note: 'Both avoid needlessly parsing stable content. Svelte Markdown additionally coalesces bursts of incoming updates at the animation-frame boundary.'
            },
            {
                name: 'Measured Streaming Performance',
                us: '2–4× faster under burst backpressure',
                them: 'Effectively tied when updates are frame-paced',
                note: 'Production Chromium benchmark against svelte-streamdown 3.1.2. Across 10–200 KB append-only streams, Svelte Markdown completed burst workloads in roughly half to one quarter of the time by coalescing updates per animation frame. At one 512-character update per frame over 50 KB, both sustained about 59 updates/second. The 50 KB output used 2,821 descendant elements with Svelte Markdown versus 3,480 with Svelte Streamdown. Reproduce with pnpm perf:stream-compare.'
            },
            {
                name: 'Measured DOM Footprint (50 KB)',
                us: '2,821 descendant elements',
                them: '3,480 descendant elements',
                note: 'Measured by the production Chromium streaming benchmark with animations and optional rich-content controls disabled. The difference reflects each renderer’s output structure; Svelte Streamdown’s additional presentation features may justify that structure for applications that use them.'
            },
            {
                name: 'Custom Renderers',
                us: '24 markdown + 83 HTML snippet overrides',
                them: 'Typed snippets + theme system'
            },
            {
                name: 'HTML Tag Control',
                us: '83 tags with allow/deny helpers',
                them: 'skipHtml + allowed element controls'
            },
            {
                name: 'URL Safety Defaults',
                us: 'Protocol allowlist + attribute sanitization',
                them: 'Configurable prefixes (allow all by default)',
                note: 'Svelte Streamdown exposes link and image prefix controls; their documented default is ["*"].'
            },
            {
                name: 'Streaming Animations',
                us: false,
                them: 'Word, character, or block animations'
            },
            { name: 'MDX-Style Components', us: false, them: true },
            { name: 'Inline Citations', us: false, them: 'Popover + list/carousel views' },
            {
                name: 'Built-in Styling',
                us: 'Unstyled by default',
                them: 'Tailwind typography + themes'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Opt-in first-class extension',
                them: 'Opt-in component'
            },
            {
                name: 'Diagrams (Mermaid)',
                us: 'Opt-in first-class extension',
                them: 'Opt-in interactive component'
            },
            {
                name: 'Code Highlighting',
                us: 'Opt-in Shiki extension',
                them: 'Opt-in Shiki component + copy button'
            },
            {
                name: 'Marked Extensions',
                us: 'Full extension objects',
                them: 'Custom tokenizers'
            },
            {
                name: 'Advanced Tables',
                us: 'GFM tables',
                them: 'GFM + row/column spans, footers, multiple headers'
            }
        ],
        prosUs: [
            ...shared.prosUs,
            'Direct transport-delta ingestion without maintaining a second reactive accumulator',
            'Native out-of-order chunk assembly with offset-addressed writes',
            'Mid-stream replacement writes for corrections and retransmission',
            'Explicit resetStream() and streamId lifecycle boundaries',
            'Measured 2–4× faster than svelte-streamdown 3.1.2 under burst backpressure',
            'Measured about 19% fewer descendant elements on the 50 KB benchmark',
            'Configurable LRU cache also accelerates repeated non-streaming documents',
            'Broad raw HTML support with per-tag renderers and allow/deny helpers',
            'Stricter URL and attribute sanitization enabled by default',
            'Unstyled core integrates without requiring Tailwind'
        ],
        prosThem: [
            'Purpose-built streaming animations at word, character, and block level',
            'MDX-style custom Svelte components inside runtime markdown',
            'Interactive citations with popover, list, and carousel presentations',
            'Opinionated typography and granular Tailwind theme system out of the box',
            'Rich built-ins including interactive Mermaid controls, code copy buttons, and advanced tables'
        ],
        consUs: [
            ...shared.consUs,
            'No built-in token reveal animations or citation UI',
            'No MDX-style component syntax inside markdown',
            'Requires application styling by design'
        ],
        consThem: [
            'No imperative chunk-ingestion API — callers update the complete content string',
            'No native offset-addressed assembly for out-of-order chunks or earlier-range corrections',
            'Stream resets and response isolation are managed in caller-owned content state',
            'No reusable LRU cache for switching among previously rendered documents',
            'Link and image prefix controls allow all origins by default',
            'Opinionated styling requires Tailwind setup or theme overrides',
            'A newer, single-maintainer port that tracks the upstream React project'
        ],
        verdict:
            'Choose Svelte Streamdown when you want a batteries-included AI response UI with animated reveals, citations, MDX-style components, interactive diagrams, and Tailwind styling. Choose @humanspeak/svelte-markdown when you want a lower-level, unstyled renderer with direct and out-of-order chunk ingestion, explicit stream lifecycle controls, frame-coalesced updates, reusable document caching, broad raw-HTML customization, and stricter security defaults. Both are credible Svelte 5 choices for incomplete streaming markdown; the deciding factor is whether you want an opinionated presentation layer or a composable rendering primitive.',
        keywords: [
            'svelte-streamdown',
            'svelte streamdown',
            'svelte-streamdown vs svelte-markdown',
            'svelte streaming markdown',
            'svelte ai markdown renderer',
            'streamdown svelte'
        ]
    },
    {
        slug: 'vs-mdsvex',
        name: 'MDsveX',
        tagline: 'Build-Time Preprocessor vs Runtime Component',
        description:
            'Compare MDsveX and @humanspeak/svelte-markdown: build-time .svx preprocessing versus runtime Svelte 5 markdown rendering, caching, and HTML control.',
        website: 'https://mdsvex.pngwn.io',
        github: 'https://github.com/pngwn/MDsveX',
        npm: 'mdsvex',
        type: 'Preprocessor',
        approach: 'Build-time (.svx files)',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: true },
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
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'MDsveX is build-time only, so there is no runtime markdown streaming mode.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'MDsveX compiles at build time — there is no runtime stream that could resolve partial HTML blocks across chunks.'
            },
            {
                name: 'HTML Tag Control',
                us: '83 tags with allow/deny',
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
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Via remark-math + rehype-katex'
            },
            {
                name: 'Diagrams (Mermaid)',
                us: 'Built-in extension (markedMermaid)',
                them: 'Via rehype-mermaid'
            },
            {
                name: 'GitHub Alerts',
                us: 'Built-in extension (markedAlert)',
                them: 'Via remark-github-alerts'
            },
            {
                name: 'Code Highlighting',
                us: 'Built-in via opt-in Shiki extension',
                them: 'Built-in (Shiki/Prism)'
            },
            { name: 'Remark/Rehype Plugins', us: false, them: true }
        ],
        prosUs: [
            ...shared.prosUs,
            'Renders dynamic/user-supplied markdown at runtime',
            'No build step required — works with any markdown string',
            'Math, Mermaid, alerts, and footnotes ship as first-class extensions — no remark/rehype pipeline required',
            'Simpler mental model — just pass a string, get rendered output'
        ],
        prosThem: [
            'Established Svelte markdown ecosystem (~3,000 GitHub stars)',
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
            'Compare Tiptap and @humanspeak/svelte-markdown: a ProseMirror rich text editor versus a focused Svelte 5 markdown renderer for display-only content.',
        website: 'https://tiptap.dev',
        github: 'https://github.com/ueberdosis/tiptap',
        npm: '@tiptap/core',
        type: 'Rich Text Editor',
        approach: 'WYSIWYG editing (ProseMirror)',
        features: [
            {
                name: 'Svelte 5 Compatibility',
                us: true,
                them: 'Official integration guide (runes or legacy syntax)'
            },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: 'Via extension' },
            { name: 'WYSIWYG Editing', us: false, them: true },
            {
                name: 'Bundle Size',
                us: 'Focused renderer + parser',
                them: 'Editor core + selected extensions'
            },
            { name: 'Custom Renderers', us: true, them: 'Via node views' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'AI Streaming',
                us: 'writeChunk() / resetStream()',
                them: 'Paid AI Toolkit',
                note: 'Tiptap can stream AI-generated text, HTML, and tool edits into an editor. This is a paid editing workflow, not a read-only streaming markdown renderer.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: 'Paid AI Toolkit streamHtml()',
                note: 'Tiptap streams HTML into an editable ProseMirror document; Svelte Markdown progressively renders an accumulating markdown/HTML response.'
            },
            { name: 'HTML Tag Control', us: '83 tags with allow/deny', them: 'Via schema' },
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
            'Massive ecosystem (~38,000 GitHub stars)',
            'Collaborative editing support (Y.js)',
            'Extensible with 100+ official extensions',
            'Framework-agnostic — works beyond Svelte'
        ],
        consUs: [...shared.consUs, 'No editing capabilities', 'No collaborative features'],
        consThem: [
            'Massive bundle size for simple rendering use cases',
            'Svelte integration is documented, but lower-level than the React and Vue packages',
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
            'Compare markdown-it and @humanspeak/svelte-markdown: raw HTML string parsing versus typed Svelte 5 renderers with caching, snippets, and HTML control.',
        website: 'https://markdown-it.github.io',
        github: 'https://github.com/markdown-it/markdown-it',
        npm: 'markdown-it',
        type: 'Markdown Parser',
        approach: 'String in, HTML string out',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: 'Framework-agnostic' },
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
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'markdown-it is a parser, not a streaming UI layer.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'Each parse returns a full HTML string — reconciling partial <tag>...</tag> structures across chunks is the caller’s responsibility.'
            },
            { name: 'Plugin Ecosystem', us: 'Via marked extensions', them: '200+ plugins' },
            {
                name: 'CommonMark Compliance',
                us: 'Via marked (GFM)',
                them: '100% CommonMark + extensions'
            },
            {
                name: 'XSS Protection',
                us: 'Built-in (URL allowlist + attr sanitization)',
                them: 'Manual sanitization required'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Via markdown-it-katex plugin'
            },
            {
                name: 'GitHub Alerts',
                us: 'Built-in extension (markedAlert)',
                them: 'Via plugin'
            },
            {
                name: 'Footnotes',
                us: 'Built-in extension (markedFootnote)',
                them: 'Via markdown-it-footnote plugin'
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
            'No need for {@html} and manual sanitization'
        ],
        prosThem: [
            'Massive ecosystem (27M+ weekly npm downloads)',
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
            'Compare marked and @humanspeak/svelte-markdown: direct markdown parsing versus a Svelte 5 component layer with renderers, caching, and safety controls.',
        website: 'https://marked.js.org',
        github: 'https://github.com/markedjs/marked',
        npm: 'marked',
        type: 'Markdown Parser',
        approach: 'String in, HTML string out',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: 'Framework-agnostic' },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Component Output', us: 'Svelte components', them: 'Raw HTML string' },
            { name: 'Custom Renderers', us: 'Svelte components', them: 'Token manipulation' },
            { name: 'Token Caching', us: 'Built-in LRU cache', them: 'Manual implementation' },
            { name: 'HTML Safety', us: 'Allow/deny per tag', them: 'Manual sanitization' },
            {
                name: 'LLM Streaming Mode',
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'marked is the parsing engine only; incremental streaming behavior must be built manually on top.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'marked parses to tokens or HTML strings per call; streaming reconciliation of nested HTML across chunks is left to the consumer.'
            },
            {
                name: 'Extensions',
                us: 'Full marked extensions support',
                them: 'Full extensions API'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Via marked-katex-extension'
            },
            {
                name: 'Diagrams (Mermaid)',
                us: 'Built-in extension (markedMermaid)',
                them: 'Via marked-mermaid'
            },
            {
                name: 'GitHub Alerts',
                us: 'Built-in extension (markedAlert)',
                them: 'Via marked-alert'
            },
            {
                name: 'Footnotes',
                us: 'Built-in extension (markedFootnote)',
                them: 'Via marked-footnote'
            },
            { name: 'GFM Support', us: true, them: true },
            {
                name: 'Bundle Size',
                us: 'Renderer layer + marked',
                them: 'Parser only'
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
            'One of the most popular JS markdown parsers (63M+ weekly npm downloads)',
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
            'Compare Milkdown and @humanspeak/svelte-markdown: a ProseMirror markdown editor versus a lightweight Svelte 5 component for rendering markdown content.',
        website: 'https://milkdown.dev',
        github: 'https://github.com/Milkdown/milkdown',
        npm: '@milkdown/core',
        type: 'WYSIWYG Markdown Editor',
        approach: 'ProseMirror + remark pipeline',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: 'Via community integration' },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: true },
            { name: 'WYSIWYG Editing', us: false, them: true },
            {
                name: 'Dependency Surface',
                us: 'Focused renderer',
                them: 'ProseMirror + remark + selected plugins'
            },
            { name: 'Custom Renderers', us: true, them: 'Via ProseMirror nodes' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'LLM Streaming Mode',
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'Milkdown updates live as an editor, but it does not document a dedicated markdown streaming renderer mode.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'Milkdown is a ProseMirror-based editor — not designed to render agent-streamed HTML where blocks resolve mid-stream.'
            },
            {
                name: 'HTML Tag Control',
                us: '83 tags with allow/deny',
                them: 'Via ProseMirror schema'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Via @milkdown/plugin-math'
            },
            {
                name: 'Diagrams (Mermaid)',
                us: 'Built-in extension (markedMermaid)',
                them: 'Via @milkdown/plugin-diagram'
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
            'Plugin-driven architecture (~11,800 GitHub stars)',
            'Collaborative editing via Y.js',
            'Slash commands, toolbar, and more',
            'Headless — fully customizable appearance'
        ],
        consUs: [...shared.consUs, 'No editing capabilities', 'No collaborative features'],
        consThem: [
            'Heavy bundle for display-only use cases',
            'No first-party Svelte package; integration is community-led',
            'Requires significant configuration and plugin wiring',
            'ProseMirror learning curve'
        ],
        verdict:
            'Choose Milkdown when you need a headless, plugin-driven markdown editor with collaborative features. Choose @humanspeak/svelte-markdown when you only need to render markdown and want a smaller API surface without ProseMirror or editor-state overhead.',
        keywords: ['milkdown', 'milkdown svelte', 'svelte markdown editor', 'milkdown vs tiptap']
    },
    {
        slug: 'vs-svelte-exmarkdown',
        name: 'svelte-exmarkdown',
        tagline: 'Two Runtime Renderers, Different Engines',
        description:
            'Compare svelte-exmarkdown and @humanspeak/svelte-markdown: unified-based runtime rendering versus marked-powered Svelte 5 renderers and streaming support.',
        github: 'https://github.com/ssssota/svelte-exmarkdown',
        npm: 'svelte-exmarkdown',
        type: 'Runtime Renderer',
        approach: 'unified/remark/rehype pipeline',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: true },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Parsing Engine', us: 'marked', them: 'unified/remark/rehype' },
            { name: 'Custom Renderers', us: true, them: true },
            { name: 'Token Caching', us: 'Built-in LRU cache', them: false },
            {
                name: 'HTML Tag Control',
                us: '83 tags with allow/deny',
                them: 'Via rehype plugins'
            },
            {
                name: 'LLM Streaming Mode',
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'svelte-exmarkdown is a runtime renderer, but its upstream docs do not describe a streaming-specific incremental mode.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'No documented streaming pipeline; partial HTML blocks during streaming aren’t reconciled into nested structures.'
            },
            { name: 'Plugin System', us: 'Marked extensions', them: 'Remark/rehype plugins' },
            { name: 'Snippet Overrides', us: true, them: false },
            {
                name: 'HTML Renderers',
                us: '83 dedicated components',
                them: 'Generic element handling'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Via remark-math + rehype-katex'
            },
            {
                name: 'Diagrams (Mermaid)',
                us: 'Built-in extension (markedMermaid)',
                them: 'Via rehype-mermaid'
            },
            {
                name: 'Dependency Surface',
                us: 'marked-based renderer',
                them: 'unified + remark + rehype pipeline'
            },
            { name: 'Marked Extensions', us: true, them: false }
        ],
        prosUs: [
            ...shared.prosUs,
            'Svelte 5 snippet overrides — customize rendering inline',
            '83 dedicated HTML tag renderers (not generic)',
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
            'Compare Carta and @humanspeak/svelte-markdown: a Svelte markdown editor and viewer versus a focused Svelte 5 renderer with caching and HTML filtering.',
        website: 'https://beartocode.github.io/carta',
        github: 'https://github.com/BearToCode/carta',
        npm: 'carta-md',
        type: 'Markdown Editor + Viewer',
        approach: 'Split-pane editor with live preview',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: true },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: true },
            { name: 'Markdown Editing', us: false, them: true },
            { name: 'Custom Renderers', us: 'Svelte components', them: 'Via plugins' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'HTML Safety',
                us: 'URL + attribute sanitization enabled by default',
                them: 'Consumer-supplied sanitizer',
                note: 'Carta explicitly does not sanitize user input by default and recommends configuring DOMPurify or sanitize-html.'
            },
            {
                name: 'LLM Streaming Mode',
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'Carta offers live preview for editing, but its docs do not describe a dedicated markdown streaming renderer mode.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'Carta is an authoring editor with live preview, not a renderer for streaming agent output with nested HTML.'
            },
            {
                name: 'Reactive Viewer',
                us: true,
                them: 'Manual render() or keyed remount',
                note: 'Carta documents that its standalone Markdown component is not reactive.'
            },
            {
                name: 'Syntax Highlighting',
                us: 'Opt-in Shiki extension',
                them: 'Built-in plugin'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Built-in plugin'
            },
            {
                name: 'Diagrams (Mermaid)',
                us: 'Built-in extension (markedMermaid)',
                them: 'Via unified/community plugin'
            },
            { name: 'Split-Pane UI', us: false, them: true },
            { name: 'Keyboard Shortcuts', us: false, them: true }
        ],
        prosUs: [
            ...shared.prosUs,
            'Simpler API — one component, one prop',
            'More granular HTML control (83 individual tag renderers)',
            'Snippet overrides for inline customization'
        ],
        prosThem: [
            'Full markdown editing experience with live preview',
            'Svelte-native (not a wrapper around another framework)',
            'Lightweight compared to ProseMirror-based editors',
            'Plugin system for syntax highlighting, math, etc.',
            'Keyboard shortcuts, toolbar, 150+ remark plugins, and component embeds'
        ],
        consUs: [...shared.consUs, 'No editing capabilities', 'No split-pane UI'],
        consThem: [
            'Bundled editor code even if you only need rendering',
            'Smaller community than established editors',
            'No sanitization by default',
            'Standalone Markdown viewer is not reactive without manual handling',
            'No token caching'
        ],
        verdict:
            'Choose Carta when you need a Svelte-native markdown editor and viewer with live preview, authoring controls, and access to remark plugins. Choose @humanspeak/svelte-markdown for reactive or streaming display, built-in caching, granular HTML rendering, and safer defaults.',
        keywords: ['carta-md', 'carta svelte', 'svelte markdown editor', 'carta vs svelte-markdown']
    },
    {
        slug: 'vs-bytemd',
        name: 'ByteMD',
        tagline: 'Full Editor vs Pure Renderer',
        description:
            'Compare ByteMD and @humanspeak/svelte-markdown: a hackable markdown editor from ByteDance versus a focused Svelte 5 renderer for app content.',
        github: 'https://github.com/bytedance/bytemd',
        npm: 'bytemd',
        type: 'Markdown Editor',
        approach: 'Split-pane editor + preview',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: 'Compiled Svelte component' },
            { name: 'TypeScript Support', us: true, them: true },
            { name: 'Markdown Rendering', us: true, them: true },
            { name: 'Markdown Editing', us: false, them: true },
            { name: 'Custom Renderers', us: true, them: 'Via plugins' },
            { name: 'Token Caching', us: true, them: false },
            {
                name: 'HTML Tag Control',
                us: '83 tags with allow/deny',
                them: 'Via sanitize schema'
            },
            {
                name: 'LLM Streaming Mode',
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'ByteMD is an editor with live preview, but its upstream docs do not describe a dedicated markdown streaming renderer mode.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'ByteMD targets the editor + live-preview workflow; agent-streamed HTML output where nested blocks resolve mid-stream is not the use case.'
            },
            {
                name: 'Plugin Ecosystem',
                us: 'Marked extensions',
                them: 'Official plugins (math, mermaid, etc.)'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Via @bytemd/plugin-math'
            },
            {
                name: 'Diagrams (Mermaid)',
                us: 'Built-in extension (markedMermaid)',
                them: 'Via @bytemd/plugin-mermaid'
            },
            { name: 'XSS Protection', us: 'Built-in', them: 'Built-in (sanitize-html)' },
            {
                name: 'Framework Support',
                us: 'Svelte 5',
                them: 'Svelte/vanilla, React, Vue, Angular'
            },
            {
                name: 'Maintenance',
                us: 'Active',
                them: 'Dormant since February 2025 (~1.4k stars)'
            }
        ],
        prosUs: [
            ...shared.prosUs,
            'Uses current Svelte 5 APIs and runes directly',
            'Actively maintained for latest Svelte',
            'Lighter bundle for rendering use cases'
        ],
        prosThem: [
            'Full markdown editor with split-pane preview',
            'Framework-agnostic — works in React, Vue, vanilla JS',
            'Official plugins for math, mermaid, syntax highlighting',
            'XSS-safe by default',
            'Established community (~1,400 GitHub stars)'
        ],
        consUs: [...shared.consUs, 'No editing capabilities'],
        consThem: [
            'Compiled from an older Svelte codebase rather than designed around Svelte 5 runes',
            'No release or repository activity since February 2025',
            'Overkill for display-only use cases',
            'Larger bundle size'
        ],
        verdict:
            'Choose ByteMD when you need an established cross-framework markdown editor/viewer with official plugins and secure defaults. Choose @humanspeak/svelte-markdown when you want an actively maintained, Svelte 5-native renderer with streaming, caching, and component-level HTML control.',
        keywords: ['bytemd', 'bytemd svelte', 'markdown editor svelte', 'bytemd vs svelte-markdown']
    },
    {
        slug: 'vs-unified-remark',
        name: 'unified / remark',
        tagline: 'AST Pipeline vs Component Renderer',
        description:
            'Compare unified/remark and @humanspeak/svelte-markdown: AST content pipelines versus a direct marked-based Svelte 5 renderer with practical defaults.',
        website: 'https://unifiedjs.com',
        github: 'https://github.com/remarkjs/remark',
        npm: 'unified',
        type: 'Content Processing Pipeline',
        approach: 'AST transformation pipeline',
        features: [
            { name: 'Svelte 5 Compatibility', us: true, them: 'Framework-agnostic' },
            { name: 'TypeScript Support', us: true, them: true },
            {
                name: 'Output',
                us: 'Svelte components',
                them: 'Syntax tree or configured compiler output',
                note: 'unified itself is a processor; plugins decide whether the result is HTML, another tree, lint messages, or something else.'
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
                us: 'writeChunk() / resetStream()',
                them: 'Via unified-stream',
                note: 'The unified ecosystem has a separate unified-stream package, but not a built-in Svelte markdown streaming mode.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'unified-stream chunks string-mode markdown but does not reconcile partial nested HTML blocks across chunks — that piece is left to the application.'
            },
            {
                name: 'Math (KaTeX)',
                us: 'Built-in extension (markedKatex)',
                them: 'Via remark-math + rehype-katex'
            },
            { name: 'AST Access', us: false, them: true },
            { name: 'Learning Curve', us: 'Minimal', them: 'Steep (AST concepts)' },
            {
                name: 'Dependency Surface',
                us: 'One renderer package',
                them: 'Pipeline assembled from multiple packages'
            },
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
            'Not a component — Svelte output requires application glue or another integration',
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
            'Compare ProseMirror and @humanspeak/svelte-markdown: low-level editor framework assembly versus a ready-to-use Svelte 5 markdown renderer for apps.',
        website: 'https://prosemirror.net',
        github: 'https://github.com/ProseMirror',
        npm: 'prosemirror-model',
        type: 'Editor Framework',
        approach: 'Low-level editor toolkit',
        features: [
            {
                name: 'Svelte 5 Compatibility',
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
                us: 'writeChunk() / resetStream()',
                them: false,
                note: 'ProseMirror updates editor state live, but it does not document a dedicated markdown streaming renderer mode.'
            },
            {
                name: 'Streaming HTML Output',
                us: 'Partial blocks reconcile when </tag> arrives',
                them: false,
                note: 'ProseMirror is an editor toolkit, not a markdown renderer — rendering agent-streamed HTML where nested blocks resolve mid-stream is outside its scope.'
            },
            {
                name: 'Dependency Surface',
                us: 'Focused renderer',
                them: 'Model + state + view + markdown modules'
            },
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
            'Industry-standard rich text toolkit with independently maintained modules',
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
            'Svelte support is via a community adapter',
            'Overkill for rendering — like using a CNC machine to cut paper',
            'Core functionality is assembled from several independently versioned modules',
            'Large dependency surface for display-only use cases'
        ],
        verdict:
            'Choose ProseMirror when you need to build a custom, production-grade editor with specific behaviors that no existing editor provides. Choose @humanspeak/svelte-markdown when you need to render markdown — it does in one component what would take weeks of ProseMirror development.',
        keywords: ['prosemirror', 'prosemirror svelte', 'svelte editor', 'prosemirror vs tiptap']
    }
]

export function getCompetitor(slug: string): Competitor | undefined {
    return competitors.find((c) => c.slug === slug)
}
