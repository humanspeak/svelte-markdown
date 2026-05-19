<script lang="ts">
    import { CodeReferenceV2, ExampleV2 } from '@humanspeak/docs-kit'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import AgentConsole from '$lib/examples/agent-output/demos/AgentConsole.svelte'
    import demoManifest from '$lib/demo-manifest.json'
    import { Shield, ShieldCheck, ShieldOff, Zap } from '@lucide/svelte'
    import type { Snippet } from 'svelte'

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'AI Agent Output | Examples | Svelte Markdown'
        seo.description =
            'Watch @humanspeak/svelte-markdown render streaming HTML from a simulated AI agent — with live sanitization that blocks javascript: URLs and on*= event handlers as they arrive.'
        seo.ogTitle = 'AI Agent Output Demo'
        seo.ogTagline = 'Streaming agent HTML with live XSS sanitization.'
        seo.ogFeatures = [
            'Streaming HTML',
            'Live Sanitization',
            'XSS Protection',
            'Mixed Markdown + HTML'
        ]
        seo.ogSlug = 'examples-agent-output'
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
            tag: 'AGENT',
            title: { prefix: 'agent ', accent: 'output', end: '.' },
            description:
                'A simulated agent streams a PR-review response mixing legitimate rich HTML (verdict box, findings table, real link) with deliberate XSS attempts — `javascript:` URLs, `onerror` / `onclick` / `onsubmit` handlers, a `vbscript:` protocol, a form posting to `javascript:`. Watch the source, the sanitized render, and the audit log fill in together.',
            snippet: agentSection,
            codeSnippet: agentCode,
            notes: agentNotes,
            barCells: [{ k: 'sanitize', v: 'url + attrs' }],
            sourceUrl: `${SOURCE_URL}agent-output/demos/AgentConsole.svelte`
        }
    ]

    const pad2 = (n: number) => String(n).padStart(2, '0')
</script>

{#snippet agentSection()}
    <AgentConsole />
{/snippet}

{#snippet agentNotes()}
    <ul>
        <li>
            <Shield />
            <span>
                Sanitization happens at the <code>Parser</code> layer — custom renderers and snippets
                cannot bypass it.
            </span>
        </li>
        <li>
            <ShieldCheck />
            <span>
                The URL allowlist covers <code>javascript:</code>, <code>vbscript:</code>,
                <code>data:</code> (where unsafe), and other dangerous protocols.
            </span>
        </li>
        <li>
            <ShieldOff />
            <span>
                Inline event handlers (<code>onclick</code>, <code>onerror</code>,
                <code>onsubmit</code>, …) and <code>srcdoc</code> are stripped before render.
            </span>
        </li>
        <li>
            <Zap />
            <span>
                Streaming-aware — every chunk is sanitized as it arrives, not after the document
                completes.
            </span>
        </li>
    </ul>
{/snippet}

{#snippet agentCode()}
    <CodeReferenceV2
        samples={[
            {
                id: 'agent-console',
                label: 'AgentConsole.svelte',
                ...manifest['agent-output/demos/AgentConsole.svelte']
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
