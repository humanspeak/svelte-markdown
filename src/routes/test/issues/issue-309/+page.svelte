<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { MarkedExtension } from 'marked'

    type DisplayFormat = 'decimal' | 'percent'

    type DisplayButtonProps = {
        displayFormat?: DisplayFormat
        number1?: number
        number2?: number
        text?: string
    }

    const source = '(1, 2)'

    let displayFormat = $state<DisplayFormat>('decimal')

    const makeDisplayButtonExtension = (format: DisplayFormat): MarkedExtension => ({
        extensions: [
            {
                name: 'displayButton',
                level: 'inline',
                start(src) {
                    return src.indexOf('(')
                },
                tokenizer(src) {
                    const match = /^\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(src)
                    if (!match) return

                    return {
                        type: 'displayButton',
                        raw: match[0],
                        text: match[0],
                        number1: Number.parseFloat(match[1]),
                        number2: Number.parseFloat(match[2]),
                        displayFormat: format
                    }
                }
            }
        ]
    })

    const extensions = $derived([makeDisplayButtonExtension(displayFormat)])
</script>

<main>
    <h2>Issue 309: Dynamic custom extension reactivity</h2>

    <div class="controls">
        <button
            type="button"
            data-testid="toggle-display-format"
            onclick={() => {
                displayFormat = displayFormat === 'decimal' ? 'percent' : 'decimal'
            }}
        >
            Toggle display format
        </button>
        <output data-testid="active-display-format">{displayFormat}</output>
    </div>

    <div class="preview" data-testid="issue-309-preview">
        <SvelteMarkdown {source} {extensions}>
            {#snippet displayButton(props: DisplayButtonProps)}
                <span
                    class="display-button"
                    data-testid="display-button"
                    data-display-format={props.displayFormat}
                    data-number-one={props.number1}
                    data-number-two={props.number2}
                >
                    rendered format: {props.displayFormat}
                </span>
            {/snippet}
        </SvelteMarkdown>
    </div>
</main>

<style>
    main {
        max-width: 720px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    h2 {
        margin: 0 0 1rem;
        font-size: 1.25rem;
    }

    .controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    button {
        padding: 0.5rem 0.75rem;
        border: 1px solid #a0aec0;
        border-radius: 0.375rem;
        background: #fff;
        color: #1a202c;
        cursor: pointer;
    }

    output {
        min-width: 5rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .preview {
        padding: 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
    }

    .display-button {
        display: inline-flex;
        padding: 0.25rem 0.5rem;
        border: 1px solid #2d3748;
        border-radius: 0.25rem;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
</style>
