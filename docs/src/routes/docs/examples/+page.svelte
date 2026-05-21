<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import type { IconName } from '$lib/icons'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Usage Examples | Svelte Markdown'
        seo.description =
            'Real-world usage examples for @humanspeak/svelte-markdown covering basic rendering, custom renderers, HTML filtering, inline rendering, and the parsed callback.'
        seo.ogTitle = 'Usage Examples'
        seo.ogTagline = 'Real-world patterns for rendering markdown.'
        seo.ogFeatures = ['Basic Rendering', 'Custom Renderers', 'HTML Filtering', 'Inline Mode']
        seo.ogSlug = 'docs-examples'
    }

    type ExampleItem = {
        title: string
        description: string
        href: string
        icon: IconName
        kind?: 'doc' | 'live'
    }

    const examples: { category: string; items: ExampleItem[] }[] = [
        {
            category: 'Getting Started',
            items: [
                {
                    title: 'Basic Rendering',
                    description:
                        'Render markdown content with the SvelteMarkdown component. Covers string input, GFM, and common patterns.',
                    href: '/docs/examples/basic-rendering',
                    icon: 'file-text'
                },
                {
                    title: 'Inline Rendering',
                    description:
                        'Use the isInline prop to render markdown without wrapping block elements.',
                    href: '/docs/examples/inline-rendering',
                    icon: 'text-cursor'
                }
            ]
        },
        {
            category: 'Customization',
            items: [
                {
                    title: 'Custom Renderers',
                    description:
                        'Override default renderers with your own Svelte components for full control over output.',
                    href: '/docs/examples/custom-renderers',
                    icon: 'paintbrush'
                },
                {
                    title: 'HTML Filtering',
                    description:
                        'Use allow/deny utilities to control which HTML tags are rendered from markdown.',
                    href: '/docs/examples/html-filtering',
                    icon: 'filter'
                }
            ]
        },
        {
            category: 'Advanced',
            items: [
                {
                    title: 'Parsed Callback',
                    description:
                        'Access parsed token data via the parsed callback prop for debugging or processing.',
                    href: '/docs/examples/parsed-callback',
                    icon: 'workflow'
                },
                {
                    title: 'Marked Extensions',
                    description:
                        'Integrate third-party marked extensions like KaTeX math rendering with custom Svelte renderers.',
                    href: '/docs/advanced/marked-extensions',
                    icon: 'puzzle'
                },
                {
                    title: 'Mermaid Diagrams',
                    description:
                        'Render Mermaid diagrams with a custom marked extension and async component renderers.',
                    href: '/examples/mermaid',
                    icon: 'workflow',
                    kind: 'live'
                },
                {
                    title: 'LLM Streaming',
                    description:
                        'Simulate real-time AI response streaming with adjustable speed, jitter, and chunk modes.',
                    href: '/examples/llm-streaming',
                    icon: 'zap',
                    kind: 'live'
                }
            ]
        }
    ]

    const quickReference = [
        {
            useCase: 'Blog posts',
            component: '<SvelteMarkdown source={post.body} />',
            notes: 'Full block rendering'
        },
        {
            useCase: 'Inline labels',
            component: '<SvelteMarkdown source={label} isInline />',
            notes: 'No wrapping <p> tags'
        },
        {
            useCase: 'Sanitized content',
            component: '<SvelteMarkdown {source} renderers={{ html: allowHtmlOnly([...]) }} />',
            notes: 'Restrict HTML tags'
        },
        {
            useCase: 'Custom styling',
            component: '<SvelteMarkdown {source} renderers={{ heading: MyHeading }} />',
            notes: 'Override specific renderers'
        },
        {
            useCase: 'Token inspection',
            component: '<SvelteMarkdown {source} parsed={handleTokens} />',
            notes: 'Access AST tokens'
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

<div class="dx not-prose">
    <header class="dx-head">
        <div class="dx-kicker">// docs / examples</div>
        <h1>usage <span>examples</span>.</h1>
        <p>
            Curated patterns for integrating <b>@humanspeak/svelte-markdown</b> — short walkthrough
            docs paired with live demos. Items marked <span class="dx-tag dx-tag-live">live</span>
            jump to interactive editors under <code>/examples</code>.
        </p>
    </header>

    {#each examples as category, ci (category.category)}
        <section class="dx-cat">
            <div class="dx-cat-head">
                <span class="dx-cat-id">{pad2(ci + 1)}</span>
                <h2>{category.category}</h2>
                <span class="dx-cat-count">
                    {category.items.length} item{category.items.length === 1 ? '' : 's'}
                </span>
            </div>
            <div class="dx-grid">
                {#each category.items as item (item.href)}
                    <a class="dx-cell" href={item.href}>
                        <div class="dx-cell-head">
                            <span class="dx-cell-tag">
                                {item.kind === 'live' ? 'LIVE DEMO' : 'WALKTHROUGH'}
                            </span>
                            <span class="dx-cell-arrow">↗</span>
                        </div>
                        <h3>{item.title}</h3>
                        <p>{item.description}</p>
                    </a>
                {/each}
            </div>
        </section>
    {/each}

    <section class="dx-ref">
        <div class="dx-cat-head">
            <span class="dx-cat-id">{pad2(examples.length + 1)}</span>
            <h2>Quick Reference</h2>
            <span class="dx-cat-count">{quickReference.length} patterns</span>
        </div>
        <div class="dx-table-wrap">
            <table class="dx-table">
                <thead>
                    <tr>
                        <th>Use case</th>
                        <th>Usage</th>
                        <th>Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {#each quickReference as row (row.useCase)}
                        <tr>
                            <td>{row.useCase}</td>
                            <td><code>{row.component}</code></td>
                            <td class="dx-table-notes">{row.notes}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>
    </section>
</div>

<style>
    /* ── Page chrome — sits inside DocsLayoutV2's content rail. */
    .dx {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink, currentColor);
    }
    .dx-head {
        margin-bottom: 32px;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .dx-kicker {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
        margin-bottom: 12px;
    }
    .dx-head h1 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 32px;
        font-weight: 500;
        letter-spacing: -0.02em;
        margin: 0 0 14px;
        color: var(--brut-ink);
        text-transform: lowercase;
    }
    .dx-head h1 span {
        color: var(--brut-accent);
    }
    .dx-head p {
        font-size: 14px;
        line-height: 1.6;
        color: var(--brut-ink-2);
        margin: 0;
        max-width: 60ch;
    }
    .dx-head p b {
        color: var(--brut-ink);
        font-weight: 600;
    }
    .dx-head p code {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 0.92em;
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        border-radius: 2px;
        color: var(--brut-ink);
    }
    .dx-tag {
        display: inline-block;
        padding: 1px 6px;
        border: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
        vertical-align: 1px;
    }
    .dx-tag-live {
        color: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    /* ── Category header (id · title · count) ────────────────────── */
    .dx-cat {
        margin-bottom: 32px;
    }
    .dx-cat-head {
        display: flex;
        align-items: baseline;
        gap: 14px;
        margin-bottom: 14px;
    }
    .dx-cat-id {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .dx-cat-head h2 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 17px;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin: 0;
        color: var(--brut-ink);
    }
    .dx-cat-count {
        margin-left: auto;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.08em;
    }

    /* ── Tile cards — hairline borders, mono labels, no gradients. */
    .dx-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0;
        border-top: 1px solid var(--brut-rule);
        border-left: 1px solid var(--brut-rule);
    }
    .dx-cell {
        display: flex;
        flex-direction: column;
        padding: 16px 18px;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        text-decoration: none;
        transition: background-color 0.15s;
    }
    .dx-cell:hover {
        background: color-mix(in oklab, var(--brut-accent) 6%, transparent);
    }
    .dx-cell-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    }
    .dx-cell-tag {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }
    .dx-cell:hover .dx-cell-tag {
        color: var(--brut-accent);
    }
    .dx-cell-arrow {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 14px;
        color: var(--brut-ink-3);
        transition:
            color 0.15s,
            transform 0.15s;
    }
    .dx-cell:hover .dx-cell-arrow {
        color: var(--brut-accent);
        transform: translate(2px, -2px);
    }
    .dx-cell h3 {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 15px;
        font-weight: 600;
        letter-spacing: -0.01em;
        margin: 0 0 6px;
        color: var(--brut-ink);
    }
    .dx-cell p {
        font-size: 13px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        margin: 0;
    }

    /* ── Quick-reference table ────────────────────────────────────── */
    .dx-ref {
        margin-top: 40px;
    }
    .dx-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--brut-rule);
    }
    .dx-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
    }
    .dx-table th {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        text-align: left;
        padding: 10px 14px;
        background: var(--brut-bg-2);
        border-bottom: 1px solid var(--brut-rule);
        color: var(--brut-ink-3);
        font-weight: 500;
    }
    .dx-table td {
        padding: 10px 14px;
        border-bottom: 1px solid var(--brut-rule);
        color: var(--brut-ink);
        vertical-align: top;
    }
    .dx-table tbody tr:last-child td {
        border-bottom: 0;
    }
    .dx-table code {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 1px 5px;
        border-radius: 2px;
        color: var(--brut-ink);
        white-space: nowrap;
    }
    .dx-table-notes {
        color: var(--brut-ink-2);
    }

    /* ── Responsive ───────────────────────────────────────────────── */
    @media (max-width: 720px) {
        .dx-grid {
            grid-template-columns: 1fr;
        }
        .dx-head h1 {
            font-size: 26px;
        }
    }
</style>
