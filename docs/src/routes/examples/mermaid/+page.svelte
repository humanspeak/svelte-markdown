<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import ComponentRendered from '$lib/examples/mermaid/demos/ComponentRendered.svelte'
    import SnippetRendered from '$lib/examples/mermaid/demos/SnippetRendered.svelte'
    import { Code, Frame, GitBranch, Layers, Moon, Puzzle } from '@lucide/svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Mermaid Diagrams | Examples | Svelte Markdown'
        seo.description =
            'Live Mermaid diagram rendering with @humanspeak/svelte-markdown via the markedMermaid extension. Two takes: built-in MermaidRenderer component vs an inline Svelte 5 snippet that wraps it with custom chrome.'
        seo.ogTitle = 'Mermaid Diagrams'
        seo.ogTagline = 'Async diagram rendering with editable markdown — component vs snippet.'
        seo.ogFeatures = [
            'Flowcharts',
            'Sequence Diagrams',
            'Component Renderer',
            'Snippet Override'
        ]
        seo.ogSlug = 'examples-mermaid'
    }

    const SOURCE_URL =
        'https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/'

    type Section = {
        figId: string
        tag: string
        title: { prefix?: string; accent: string; end?: string }
        description: string
        snippet: Snippet
        codeSnippet?: Snippet
        notes?: Snippet
        mode?: 'live' | 'static'
        barCells?: { k: string; v: string }[]
        sourceUrl?: string
    }

    type ManifestEntry = {
        code: string
        lang: string
        html?: { light: string; dark: string }
    }
    const manifest = demoManifest as Record<string, ManifestEntry>

    const sections: Section[] = [
        {
            figId: 'FIG-001',
            tag: 'COMPONENT',
            title: { prefix: 'component ', accent: 'renderer', end: '.' },
            description:
                'Pass the built-in `MermaidRenderer` through the `renderers` prop. Handles async rendering, loading + error states, and dark-mode reactivity with no custom logic on your end.',
            snippet: componentSection,
            codeSnippet: componentCode,
            notes: componentNotes,
            barCells: [{ k: 'override', v: 'component' }],
            sourceUrl: `${SOURCE_URL}mermaid/demos/ComponentRendered.svelte`
        },
        {
            figId: 'FIG-002',
            tag: 'SNIPPET',
            title: { prefix: 'snippet ', accent: 'wrapped', end: '.' },
            description:
                'Wrap each diagram in extra chrome via `{#snippet mermaid}` — figure + caption, custom container, anything you want. Delegates the async rendering itself to MermaidRenderer.',
            snippet: snippetSectionRender,
            codeSnippet: snippetCode,
            notes: snippetNotes,
            barCells: [{ k: 'override', v: 'snippet wrap' }],
            sourceUrl: `${SOURCE_URL}mermaid/demos/SnippetRendered.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet componentSection()}
    <ComponentRendered />
{/snippet}
{#snippet componentNotes()}
    <ul>
        <li>
            <Puzzle />
            <span>
                <code>markedMermaid()</code> registers an async <code>walkTokens</code> extension
                that turns <code>```mermaid</code> fences into renderable tokens.
            </span>
        </li>
        <li>
            <GitBranch />
            <span>
                Built-in <code>MermaidRenderer</code> handles flowcharts, sequence diagrams, class diagrams,
                state diagrams, gantt charts.
            </span>
        </li>
        <li>
            <Moon />
            <span>
                Loading + error states + dark-mode theme switching are all handled — zero custom
                logic on your end.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet componentCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'component-rendered',
                label: 'ComponentRendered.svelte',
                ...manifest['mermaid/demos/ComponentRendered.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#snippet snippetSectionRender()}
    <SnippetRendered />
{/snippet}
{#snippet snippetNotes()}
    <ul>
        <li>
            <Code />
            <span>
                <code>{'{#snippet mermaid({ text })}'}</code> lets the page own the chrome around each
                diagram — figure + caption, custom container, anything.
            </span>
        </li>
        <li>
            <Frame />
            <span>
                The async rendering itself still delegates to <code>MermaidRenderer</code> — you only
                own the wrapper.
            </span>
        </li>
        <li>
            <Layers />
            <span>
                Pairs nicely with <code>markedMermaid()</code> — extension parses the fences, snippet
                shapes the output.
            </span>
        </li>
    </ul>
{/snippet}
{#snippet snippetCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'snippet-rendered',
                label: 'SnippetRendered.svelte',
                ...manifest['mermaid/demos/SnippetRendered.svelte']
            }
        ]}
        columns={1}
    />
{/snippet}

{#each sections as section, i (section.figId)}
    <ExampleV2
        figId={section.figId}
        tag={section.tag}
        title={section.title}
        description={section.description}
        mode={section.mode ?? 'live'}
        sheetLabel="SHEET {pad2(i + 1)} / {pad2(sections.length)}"
        barCells={section.barCells}
        sourceUrl={section.sourceUrl}
        codeSnippet={section.codeSnippet}
        codeLabel="show code"
        notes={section.notes}
    >
        {@render section.snippet()}
    </ExampleV2>
{/each}
