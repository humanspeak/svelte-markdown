<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'

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

    type Example = {
        slug: string
        title: string
        tag: string
        description: string
    }

    const examples: Example[] = [
        {
            slug: 'playground',
            title: 'live playground',
            tag: 'DEMO',
            description:
                'Edit markdown in real-time and see it rendered instantly. Mix markdown with HTML tags.'
        },
        {
            slug: 'custom-renderers',
            title: 'custom renderers',
            tag: 'RENDERERS',
            description:
                'Override default renderers and control which markdown elements are rendered.'
        },
        {
            slug: 'html-filtering',
            title: 'html filtering',
            tag: 'SECURITY',
            description: 'Interactive demo of allow/deny controls for HTML tags within markdown.'
        },
        {
            slug: 'caching-performance',
            title: 'caching performance',
            tag: 'PERFORMANCE',
            description:
                'Explore token caching and see the performance improvement on repeated renders.'
        },
        {
            slug: 'marked-extensions',
            title: 'marked extensions',
            tag: 'EXTENSIONS',
            description:
                'Live KaTeX math with the extensions prop. Try component renderers and snippet overrides.'
        },
        {
            slug: 'mermaid',
            title: 'mermaid diagrams',
            tag: 'EXTENSIONS',
            description:
                'Async Mermaid diagram rendering with a custom marked extension. Flowcharts, sequence diagrams, and more.'
        },
        {
            slug: 'github-alerts',
            title: 'github alerts',
            tag: 'EXTENSIONS',
            description:
                'GitHub-style alert admonitions (NOTE, TIP, IMPORTANT, WARNING, CAUTION) with markedAlert.'
        },
        {
            slug: 'footnotes',
            title: 'footnotes',
            tag: 'EXTENSIONS',
            description:
                'Footnote references and definitions with bidirectional linking using markedFootnote.'
        },
        {
            slug: 'code-formatting',
            title: 'code formatting',
            tag: 'EXTENSIONS',
            description:
                'Enhance code blocks with walkTokens extensions and snippet overrides — no custom renderers required.'
        },
        {
            slug: 'snippet-overrides',
            title: 'snippet overrides',
            tag: 'SNIPPETS',
            description:
                'Customize rendering inline with Svelte 5 snippets. No separate component files needed.'
        },
        {
            slug: 'linked-headings',
            title: 'linked headings',
            tag: 'SNIPPETS',
            description:
                'Add clickable anchor links to headings with snippet overrides or custom renderers.'
        },
        {
            slug: 'llm-streaming',
            title: 'llm streaming',
            tag: 'STREAMING',
            description:
                'Stream markdown and rich HTML from AI agents in real time. Adjustable speed, jitter, and chunk modes — XSS-safe by default.'
        },
        {
            slug: 'agent-output',
            title: 'agent output',
            tag: 'STREAMING',
            description:
                'Watch a simulated agent stream mixed markdown and HTML — with a live log of every javascript: URL and on*= handler the sanitizer blocks.'
        }
    ]
</script>

<main class="brut">
    <!-- ── Coordinate strip ─────────────────────────────────────── -->
    <div class="brut-coord" aria-hidden="true">
        {#each Array.from({ length: 12 }, (_, i) => i) as i (i)}
            <div>{String(i + 1).padStart(2, '0')}</div>
        {/each}
    </div>

    <!-- ── FIG-001 · MASTHEAD ───────────────────────────────────── -->
    <section class="brut-hero">
        <div class="corner tr">FIG-001 · EXAMPLES INDEX</div>
        <aside class="meta">
            <div><span class="k">demos</span> · <span class="v">{examples.length}</span></div>
            <div><span class="k">format</span> · <span class="v">live editors</span></div>
            <div><span class="k">tone</span> · <span class="v">interactive</span></div>
            <hr />
            <div>
                <span class="k">library</span> ·
                <span class="v">@humanspeak/svelte-markdown</span>
            </div>
            <div>
                <span class="k">framework</span> · <span class="v accent">svelte 5</span>
            </div>
            <hr />
            <div class="k">// scroll for demos</div>
        </aside>
        <div class="hero-body">
            <div class="k">// examples / live demos</div>
            <h1>
                <span>examples</span><span class="end">.</span>
            </h1>
            <p class="sub">
                Hands-on demos of <b>@humanspeak/svelte-markdown</b> — live editors, agent / LLM streaming,
                HTML filtering, custom renderers, token caching, KaTeX, Mermaid, and more. Edit, copy,
                ship.
            </p>
            <div class="cta-row">
                <a class="pri" href="/examples/playground">open playground ↗</a>
                <a href="/docs/getting-started">get started</a>
                <a href="/compare">compare</a>
            </div>
        </div>
        <div class="corner bl">FIG-001</div>
        <div class="corner br">SHEET 01 / 02</div>
    </section>

    <!-- ── FIG-002 · DEMO GRID ──────────────────────────────────── -->
    <section class="brut-grid-section">
        <div class="lede">
            <div class="k">FIG-002 / DEMOS</div>
            <h2>pick a <span>demo</span>.</h2>
            <p>
                Each page is a self-contained live example with the source you need to copy into
                your own project.
            </p>
        </div>
        <div class="grid">
            {#each examples as example, i (example.slug)}
                <a class="cell" href="/examples/{example.slug}">
                    <div class="id">
                        № {String(i + 1).padStart(2, '0')} / {String(examples.length).padStart(
                            2,
                            '0'
                        )}
                    </div>
                    <div class="corner">↗</div>
                    <h3>{example.title}.</h3>
                    <p class="tag">{example.tag}</p>
                    <p class="line">{example.description}</p>
                    <div class="marker"></div>
                </a>
            {/each}
        </div>
    </section>

    <!-- ── Big-type footer ──────────────────────────────────────── -->
    <section class="brut-foot">
        <div class="info">
            <div>SET / JETBRAINS MONO + INTER</div>
            <div>HUMANSPEAK · 2026</div>
            <div>MIT LICENCE</div>
        </div>
        <a class="big" href="/examples/playground">
            try <br /><span>the playground</span> →
            <span class="copy-hint">edit markdown live</span>
        </a>
        <div class="info right">
            <div>SHEET 02 / 02</div>
            <div>END OF INDEX</div>
            <a class="v" href="/">↩ HOME</a>
        </div>
    </section>
</main>

<style>
    /* Mirror the brutalist tokens & layout used by CompareIndexV2
       so the two index pages feel like the same sheet of paper. */

    .brut-coord {
        display: grid;
        grid-template-columns: repeat(12, 1fr);
        border-bottom: 1px solid var(--brut-rule);
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-coord div {
        padding: 6px 8px;
        border-right: 1px solid var(--brut-rule);
    }
    .brut-coord div:last-child {
        border-right: 0;
    }

    .brut-hero {
        padding: 80px 24px 32px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
        position: relative;
    }
    .brut-hero .meta {
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .brut-hero .meta .k {
        color: var(--brut-ink-3);
    }
    .brut-hero .meta .v {
        color: var(--brut-ink);
    }
    .brut-hero .meta .v.accent {
        color: var(--brut-accent);
    }
    .brut-hero .meta hr {
        border: 0;
        border-top: 1px dashed var(--brut-rule);
        margin: 8px 0;
    }
    .brut-hero .hero-body .k {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-hero h1 {
        margin: 8px 0 0;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(56px, 11vw, 152px);
        line-height: 0.88;
        font-weight: 500;
        letter-spacing: -0.06em;
        text-transform: lowercase;
    }
    .brut-hero h1 span {
        color: var(--brut-accent);
    }
    .brut-hero h1 .end {
        color: var(--brut-ink-3);
    }
    .brut-hero .sub {
        margin: 28px 0 0;
        max-width: 720px;
        font-size: 17px;
        line-height: 1.5;
        color: var(--brut-ink-2);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        letter-spacing: -0.01em;
    }
    .brut-hero .sub :global(b) {
        color: var(--brut-ink);
        font-weight: 600;
    }
    .brut-hero .cta-row {
        margin-top: 28px;
        display: flex;
        flex-wrap: wrap;
        gap: 0;
        width: fit-content;
        max-width: 100%;
    }
    .brut-hero .cta-row > * {
        padding: 10px 14px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        font-size: 13px;
        color: var(--brut-ink);
        text-decoration: none;
        position: relative;
        z-index: 1;
        transition:
            background 0.15s,
            border-color 0.15s;
    }
    .brut-hero .cta-row > * + * {
        margin-left: -1px;
    }
    .brut-hero .cta-row .pri {
        background: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-weight: 600;
        border-color: var(--brut-accent);
    }
    .brut-hero .cta-row .pri:hover {
        background: var(--brut-accent-hover);
        border-color: var(--brut-accent-hover);
    }
    .brut-hero .cta-row a:not(.pri):hover {
        background: var(--brut-bg-2);
        border-color: var(--brut-rule-2);
    }
    .brut-hero .corner {
        position: absolute;
        font-size: 10px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-hero .corner.tr {
        top: 12px;
        right: 24px;
    }
    .brut-hero .corner.bl {
        bottom: 12px;
        left: 24px;
    }
    .brut-hero .corner.br {
        bottom: 12px;
        right: 24px;
    }

    /* ── Grid section ─────────────────────────────────────────── */
    .brut-grid-section {
        padding: 28px 24px;
        display: grid;
        grid-template-columns: 220px 1fr;
        gap: 24px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .brut-grid-section .lede .k {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-grid-section .lede h2 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        color: var(--brut-ink);
        margin: 12px 0 0;
        letter-spacing: -0.02em;
        text-transform: lowercase;
        font-weight: 500;
    }
    .brut-grid-section .lede h2 span {
        color: var(--brut-accent);
    }
    .brut-grid-section .lede p {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2);
        margin: 12px 0 0;
        font-size: 13px;
        line-height: 1.55;
        max-width: 220px;
    }
    .brut-grid-section .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        border-left: 1px solid var(--brut-rule);
        border-top: 1px solid var(--brut-rule);
    }
    .brut-grid-section .cell {
        display: block;
        border-right: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
        padding: 22px 22px 26px;
        min-height: 240px;
        position: relative;
        color: var(--brut-ink);
        text-decoration: none;
        background: var(--brut-bg);
    }
    .brut-grid-section .cell::after {
        content: '';
        position: absolute;
        inset: 8px;
        border: 1px solid transparent;
        pointer-events: none;
        transition: border-color 0.2s;
    }
    .brut-grid-section .cell:hover::after {
        border-color: var(--brut-accent);
    }
    .brut-grid-section .cell .id {
        font-size: 10.5px;
        color: var(--brut-ink-3);
        letter-spacing: 0.14em;
    }
    .brut-grid-section .cell h3 {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 28px;
        font-weight: 500;
        letter-spacing: -0.03em;
        margin: 26px 0 6px;
        color: var(--brut-ink);
        text-transform: lowercase;
    }
    .brut-grid-section .cell:hover h3 {
        color: var(--brut-accent);
    }
    .brut-grid-section .cell .tag {
        font-size: 10.5px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        margin: 0;
    }
    .brut-grid-section .cell .line {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        font-size: 13.5px;
        color: var(--brut-ink-2);
        line-height: 1.5;
        margin: 12px 0 0;
        max-width: 320px;
    }
    .brut-grid-section .cell .corner {
        position: absolute;
        top: 14px;
        right: 16px;
        font-size: 14px;
        color: var(--brut-ink-3);
        transition: color 0.2s;
    }
    .brut-grid-section .cell:hover .corner {
        color: var(--brut-accent);
    }
    .brut-grid-section .cell .marker {
        width: 14px;
        height: 14px;
        border: 1px solid var(--brut-ink-3);
        position: absolute;
        bottom: 16px;
        right: 16px;
    }
    .brut-grid-section .cell:nth-child(3n + 1) .marker {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
    }

    /* ── Footer ───────────────────────────────────────────────── */
    .brut-foot {
        padding: 60px 24px 36px;
        display: grid;
        grid-template-columns: 200px 1fr 200px;
        gap: 24px;
        border-top: 1px solid var(--brut-rule);
        align-items: end;
    }
    .brut-foot .big {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: clamp(40px, 7vw, 96px);
        line-height: 0.9;
        letter-spacing: -0.06em;
        text-transform: lowercase;
        color: var(--brut-ink);
        text-decoration: none;
        display: inline-block;
    }
    .brut-foot .big span {
        color: var(--brut-accent);
    }
    .brut-foot .big .copy-hint {
        display: block;
        margin-top: 16px;
        font-size: 11px;
        letter-spacing: 0.14em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
    }
    .brut-foot .big:hover .copy-hint {
        color: var(--brut-accent);
    }
    .brut-foot .info {
        font-size: 11px;
        color: var(--brut-ink-3);
        letter-spacing: 0.12em;
        line-height: 1.8;
    }
    .brut-foot .info.right {
        text-align: right;
    }
    .brut-foot .info .v,
    .brut-foot .info a.v {
        color: var(--brut-ink);
        text-decoration: none;
        display: block;
        margin-top: 12px;
    }
    .brut-foot .info a.v:hover {
        color: var(--brut-accent);
    }

    @media (max-width: 1024px) {
        .brut-grid-section .grid {
            grid-template-columns: repeat(2, 1fr);
        }
    }
    @media (max-width: 720px) {
        .brut-coord {
            display: none;
        }
        .brut-hero,
        .brut-grid-section {
            grid-template-columns: 1fr;
            padding-left: 16px;
            padding-right: 16px;
        }
        .brut-hero {
            padding-top: 56px;
        }
        .brut-grid-section .grid {
            grid-template-columns: 1fr;
        }
        .brut-foot {
            grid-template-columns: 1fr;
            padding: 40px 16px 28px;
        }
        .brut-foot .info.right {
            text-align: left;
        }
    }
</style>
