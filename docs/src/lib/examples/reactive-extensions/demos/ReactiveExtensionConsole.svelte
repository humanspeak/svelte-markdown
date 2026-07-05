<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { MarkedExtension, RendererComponent, Renderers } from '@humanspeak/svelte-markdown'
    import { DemoSplitV2 } from '@humanspeak/docs-kit'
    import DisplayButtonRenderer from './DisplayButtonRenderer.svelte'

    type DisplayFormat = 'decimal' | 'dms' | 'mission'
    type VisualMode = 'signal' | 'neon' | 'compact'

    type DisplayButtonToken = {
        type: 'displayButton'
        raw: string
        text: string
        number1: number
        number2: number
        displayFormat: DisplayFormat
        visualMode: VisualMode
    }

    type MarkdownToken = {
        type: string
        raw?: string
        text?: string
        tokens?: MarkdownToken[]
        number1?: number
        number2?: number
        displayFormat?: DisplayFormat
        visualMode?: VisualMode
    }

    interface DisplayButtonRenderers extends Renderers {
        displayButton: RendererComponent
    }

    const defaultMarkdown = `## Reactive mission pins

Swap the format below. The same source markdown reparses with the newest tokenizer closure:

- Boston harbor: @(42.3601, -71.0589)
- Tokyo tower: @(35.6586, 139.7454)
- Cape Town signal: @(-33.9249, 18.4241)

> The important bit is the extension array identity. Rebuild it from state instead of mutating an existing array.`

    let source = $state(defaultMarkdown)
    let quickNote = $state('Try typing here: dispatch rescue team to @(47.6062, -122.3321).')
    let displayFormat = $state<DisplayFormat>('decimal')
    let visualMode = $state<VisualMode>('signal')
    let parsedTokens = $state<MarkdownToken[]>([])

    const formatLabels: Record<DisplayFormat, string> = {
        decimal: 'Decimal',
        dms: 'DMS',
        mission: 'Mission'
    }

    const visualModeLabels: Record<VisualMode, string> = {
        signal: 'Signal',
        neon: 'Neon',
        compact: 'Compact'
    }

    const makeDisplayButtonExtension = (
        format: DisplayFormat,
        mode: VisualMode
    ): MarkedExtension => ({
        extensions: [
            {
                name: 'displayButton',
                level: 'inline',
                start(src) {
                    return src.indexOf('@(')
                },
                tokenizer(src) {
                    const match = /^@\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(src)
                    if (!match) return

                    return {
                        type: 'displayButton',
                        raw: match[0],
                        text: match[0],
                        number1: Number.parseFloat(match[1]),
                        number2: Number.parseFloat(match[2]),
                        displayFormat: format,
                        visualMode: mode
                    } satisfies DisplayButtonToken
                }
            }
        ]
    })

    const renderedSource = $derived(
        `${source}\n\n### Live operator note\n\n${quickNote || 'Type in the quick note field to update this section.'}`
    )

    const extensions = $derived([makeDisplayButtonExtension(displayFormat, visualMode)])

    const renderers: Partial<DisplayButtonRenderers> = {
        displayButton: DisplayButtonRenderer
    }

    const collectDisplayButtons = (tokens: MarkdownToken[]): MarkdownToken[] =>
        tokens.flatMap((token) => [
            ...(token.type === 'displayButton' ? [token] : []),
            ...(token.tokens ? collectDisplayButtons(token.tokens) : [])
        ])

    const displayButtons = $derived(collectDisplayButtons(parsedTokens))

    const parsed = (tokens: MarkdownToken[]) => {
        parsedTokens = tokens
    }
</script>

<div class="rx-shell">
    <div class="rx-topline">
        <span>issue #309 repro pattern</span>
        <span>{displayButtons.length} custom tokens</span>
        <span>format: {formatLabels[displayFormat]}</span>
        <span>mode: {visualModeLabels[visualMode]}</span>
    </div>

    <div class="rx-panel">
        <div class="rx-live-input">
            <label for="quick-note">Quick note rendered through SvelteMarkdown</label>
            <input
                id="quick-note"
                bind:value={quickNote}
                type="text"
                spellcheck="false"
                placeholder="Type markdown text, including @(42.36, -71.06), and watch the preview change."
            />
        </div>

        <div class="rx-control-grid">
            <div class="rx-control-group" aria-label="Display format">
                <span>format</span>
                <div class="rx-control-row">
                    {#each Object.entries(formatLabels) as [format, label] (format)}
                        <button
                            class:active={displayFormat === format}
                            type="button"
                            onclick={() => {
                                displayFormat = format as DisplayFormat
                            }}
                        >
                            <span>{label}</span>
                        </button>
                    {/each}
                </div>
            </div>
            <div class="rx-control-group" aria-label="Visual mode">
                <span>chip mode</span>
                <div class="rx-control-row">
                    {#each Object.entries(visualModeLabels) as [mode, label] (mode)}
                        <button
                            class:active={visualMode === mode}
                            type="button"
                            onclick={() => {
                                visualMode = mode as VisualMode
                            }}
                        >
                            <span>{label}</span>
                        </button>
                    {/each}
                </div>
            </div>
        </div>

        <DemoSplitV2
            leftLabel="MARKDOWN"
            leftTone="markdown"
            rightLabel="LIVE RENDER"
            rightTone="rendered"
        >
            {#snippet left()}
                <textarea
                    bind:value={source}
                    class="rx-editor"
                    spellcheck="false"
                    aria-label="Markdown source"></textarea>
            {/snippet}
            {#snippet right()}
                <div class="rx-preview prose prose-sm dark:prose-invert max-w-none">
                    <SvelteMarkdown source={renderedSource} {extensions} {renderers} {parsed} />
                </div>
            {/snippet}
        </DemoSplitV2>

        <div class="rx-log">
            <div class="rx-log-title">
                <span>tokenizer telemetry</span>
                <span>fresh array from $derived</span>
            </div>
            <div class="rx-log-grid">
                {#each displayButtons as token, index (`${token.raw}-${index}`)}
                    <div class="rx-log-row">
                        <code>{token.raw}</code>
                        <span>{token.number1?.toFixed(4)}, {token.number2?.toFixed(4)}</span>
                        <strong>{token.displayFormat} / {token.visualMode}</strong>
                    </div>
                {:else}
                    <p>
                        No coordinate tokens yet. Add something like <code>@(42.36, -71.06)</code>.
                    </p>
                {/each}
            </div>
        </div>
    </div>
</div>

<style>
    .rx-shell {
        color: var(--brut-ink, currentColor);
        background:
            linear-gradient(90deg, color-mix(in oklab, #15b8a6 12%, transparent), transparent 36%),
            linear-gradient(
                135deg,
                transparent 0 48%,
                color-mix(in oklab, #e255a1 18%, transparent) 48% 52%,
                transparent 52%
            ),
            var(--brut-bg);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
    }

    .rx-topline {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 18px;
        min-height: 38px;
        padding: 8px 14px;
        border-bottom: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }

    .rx-topline span:last-child {
        color: var(--brut-accent);
    }

    .rx-panel {
        padding: 14px;
    }

    .rx-live-input {
        display: grid;
        gap: 6px;
        margin-bottom: 12px;
    }

    .rx-live-input label,
    .rx-control-group > span {
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--brut-ink-3);
    }

    .rx-live-input input {
        min-height: 42px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
        color: var(--brut-ink);
        outline: none;
        padding: 0 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
        box-shadow: inset 4px 0 0 #15b8a6;
    }

    .rx-live-input input:focus {
        border-color: var(--brut-accent);
        box-shadow:
            inset 4px 0 0 #15b8a6,
            4px 4px 0 var(--brut-accent);
    }

    .rx-control-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 12px;
    }

    .rx-control-group {
        display: grid;
        gap: 6px;
    }

    .rx-control-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 8px;
    }

    .rx-control-row button {
        appearance: none;
        min-height: 42px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
        transition:
            border-color 0.16s ease,
            color 0.16s ease,
            transform 0.16s ease,
            box-shadow 0.16s ease;
    }

    .rx-control-row button:hover,
    .rx-control-row button.active {
        border-color: var(--brut-accent);
        color: var(--brut-ink);
        box-shadow: 4px 4px 0 var(--brut-accent);
        transform: translate(-2px, -2px);
    }

    .rx-editor {
        width: 100%;
        height: 100%;
        min-height: 360px;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--brut-ink, inherit);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.7;
        padding: 0;
    }

    .rx-preview {
        min-height: 360px;
        color: var(--brut-ink-2, inherit);
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
    }

    .rx-preview :global(h1),
    .rx-preview :global(h2),
    .rx-preview :global(h3),
    .rx-preview :global(h4) {
        color: var(--brut-ink);
        letter-spacing: 0;
    }

    .rx-preview :global(blockquote) {
        margin: 1rem 0 0;
        border-left: 3px solid #e255a1;
        background: color-mix(in oklab, #e255a1 9%, transparent);
        padding: 0.75rem 1rem;
        color: var(--brut-ink-2);
    }

    .rx-preview :global(code) {
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        padding: 0 4px;
        font-size: 12px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }

    .rx-log {
        margin-top: 12px;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg);
    }

    .rx-log-title,
    .rx-log-row {
        display: grid;
        grid-template-columns: minmax(120px, 0.8fr) minmax(160px, 1fr) minmax(90px, 0.55fr);
        gap: 8px;
        align-items: center;
    }

    .rx-log-title {
        min-height: 34px;
        padding: 0 12px;
        border-bottom: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        color: var(--brut-ink-3);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .rx-log-grid {
        display: grid;
    }

    .rx-log-row {
        padding: 9px 12px;
        border-top: 1px solid color-mix(in oklab, var(--brut-rule) 70%, transparent);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11.5px;
    }

    .rx-log-row:first-child {
        border-top: 0;
    }

    .rx-log-row code {
        width: fit-content;
        max-width: 100%;
        overflow-wrap: anywhere;
        border: 1px solid var(--brut-rule);
        background: var(--brut-bg-2);
        padding: 2px 6px;
        color: var(--brut-ink);
    }

    .rx-log-row span {
        overflow-wrap: anywhere;
        color: var(--brut-ink-2);
    }

    .rx-log-row strong {
        color: #e255a1;
        text-transform: uppercase;
    }

    .rx-log-grid p {
        margin: 0;
        padding: 12px;
        color: var(--brut-ink-3);
        font-size: 12px;
    }

    @media (max-width: 720px) {
        .rx-control-row,
        .rx-control-grid,
        .rx-log-title,
        .rx-log-row {
            grid-template-columns: 1fr;
        }

        .rx-panel {
            padding: 10px;
        }
    }
</style>
