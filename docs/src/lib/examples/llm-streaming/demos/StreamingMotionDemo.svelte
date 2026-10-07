<script lang="ts">
    import { onMount, tick } from 'svelte'
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import {
        FadeWords,
        RiseWords,
        FadeCharacters
    } from '@humanspeak/svelte-markdown/streaming/motion'
    import type { StreamingTextGranularity } from '@humanspeak/svelte-markdown'
    import MotionStreamingText from './MotionStreamingText.svelte'

    let effect = $state('fade-words')
    let duration = $state(0.18)
    let cadence = $state(100)
    let stagger = $state(0.02)
    let granularity = $state<StreamingTextGranularity>('word')
    let disabled = $state(false)
    // SSR and the first hydration render show baseline content without animation.
    let reducedMotion = $state(true)
    const baseline =
        '### A slower kind of morning\n\nThe notebook is already open. This passage stays in place while the next part of the story arrives.\n\n'
    const sample =
        'Sunlight finds the edge of the desk, then the **first words** appear on the page. A thought becomes a sentence, a sentence becomes a small story, and there is time to watch each arrival.\n\nOutside, the café is waking up. Someone waves 👩‍💻 from the window; a quiet “bonjour” travels across the room. We can’t hurry the morning, but we can give it a little *lift*.\n\nTry another effect and replay the story. The words keep their spaces, the accents keep their shape, and `const greeting = "Hello, 世界"` stays plain.'
    // Keep each word and its original whitespace together; never reconstruct text.
    const chunks = sample.match(/\S+\s*/gu) ?? []
    let source = $state(baseline)
    let streamId = $state(0)
    let running = $state(false)
    let received = $state(0)
    let starting = false
    let timer: ReturnType<typeof setInterval> | undefined
    const enabled = $derived(!disabled && !reducedMotion)
    const Preset = $derived(
        effect === 'rise-words'
            ? RiseWords
            : effect === 'fade-characters'
              ? FadeCharacters
              : FadeWords
    )

    const description = $derived(
        effect === 'plain'
            ? 'Plain text is the library default. No arrival animation.'
            : effect === 'rise-words'
              ? 'Words fade in with a small upward lift.'
              : effect === 'fade-characters'
                ? 'Letters and whole emoji fade in individually.'
                : effect === 'custom'
                  ? 'Your headless snippet controls segmentation and stagger.'
                  : 'Each new word fades into the sentence.'
    )
    function stop() {
        clearInterval(timer)
        timer = undefined
        running = false
        starting = false
    }
    function reset() {
        stop()
        source = baseline
        received = 0
        streamId++
    }
    async function start() {
        reset()
        starting = true
        const epoch = streamId
        // Commit the reset seed before appending: it is baseline, never an entrance.
        await tick()
        if (!starting || epoch !== streamId) return
        starting = false
        running = true
        timer = setInterval(() => {
            source += chunks[received++]
            if (received === chunks.length) stop()
        }, cadence)
    }
    onMount(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => {
            reducedMotion = query.matches
        }
        update()
        query.addEventListener('change', update)
        return () => {
            query.removeEventListener('change', update)
            stop()
        }
    })
</script>

<div class="sm-demo">
    <div class="sm-bar">
        <span>TEXT / ARRIVAL MOTION</span>
        <span class="sm-state"
            >{running
                ? '● streaming'
                : received === chunks.length
                  ? '○ complete'
                  : received
                    ? '○ stopped'
                    : '○ ready'}</span
        >
    </div>
    <div class="sm-controls">
        <div class="sm-settings">
            <label class="sm-field sm-effect">
                <span>Effect</span>
                <select
                    bind:value={effect}
                    onchange={reset}
                    aria-describedby="motion-effect-description"
                >
                    <option value="plain">Plain · no animation</option>
                    <option value="fade-words">FadeWords · fade words</option>
                    <option value="rise-words">RiseWords · lift words</option>
                    <option value="fade-characters">FadeCharacters · fade letters</option>
                    <option value="custom">Custom headless snippet</option>
                </select>
            </label>
            <label class="sm-field">
                <span>Duration <span class="sm-value">{duration.toFixed(2)} s</span></span>
                <input type="range" min="0" max="1" step="0.02" bind:value={duration} />
            </label>
            <label class="sm-field">
                <span>Arrival pace <span class="sm-value">{cadence} ms / word</span></span>
                <input
                    type="range"
                    min="40"
                    max="200"
                    step="10"
                    bind:value={cadence}
                    disabled={running}
                />
            </label>
            <label class="sm-toggle"
                ><input type="checkbox" bind:checked={disabled} /> Disable motion</label
            >
        </div>
        <p class="sm-description" id="motion-effect-description">
            {description} Choose an effect, then stream the sample.
        </p>
        {#if effect === 'custom'}
            <div class="sm-custom">
                <label class="sm-field">
                    <span>Custom granularity</span>
                    <select bind:value={granularity} onchange={reset}>
                        <option value="word">Word</option>
                        <option value="grapheme">Grapheme (letter / emoji)</option>
                    </select>
                </label>
                <label class="sm-field">
                    <span>Custom stagger <span class="sm-value">{stagger.toFixed(2)} s</span></span>
                    <input type="range" min="0" max="0.1" step="0.01" bind:value={stagger} />
                </label>
            </div>
        {/if}
        <div class="sm-actions">
            <button class="sm-primary" onclick={start}
                >{received || running ? '↻ Replay sample' : '▶ Stream sample'}</button
            >
            <button onclick={stop} disabled={!running}>■ Stop</button>
            <button onclick={reset}>Reset</button>
            <span class="sm-motion-status"
                >{reducedMotion
                    ? 'System reduced motion · animation off'
                    : disabled
                      ? 'Motion disabled'
                      : 'Motion enabled'}</span
            >
        </div>
    </div>
    <div class="sm-comparison" class:sm-single={effect === 'plain'}>
        {#if effect !== 'plain'}
            <div class="sm-pane">
                <div class="sm-output-label">
                    <span>PLAIN / NO ANIMATION</span><span>same stream</span>
                </div>
                <div class="sm-output" data-testid="plain-output">
                    <SvelteMarkdown {source} {streamId} streaming />
                </div>
            </div>
        {/if}
        <div class="sm-pane">
            <div class="sm-output-label">
                <span>SELECTED / {effect === 'custom' ? 'CUSTOM SNIPPET' : effect}</span>
                <span>{received}/{chunks.length} words</span>
            </div>
            <div data-testid="motion-output" class="sm-output">
                <SvelteMarkdown {source} {streamId} streaming streamingText>
                    {#snippet rawtext({ text, streamingText })}
                        {#if effect === 'plain'}
                            {text}
                        {:else if effect === 'custom'}
                            <MotionStreamingText
                                {text}
                                {streamingText}
                                {enabled}
                                {duration}
                                {stagger}
                                {granularity}
                            />
                        {:else}
                            <Preset
                                {text}
                                {streamingText}
                                {enabled}
                                transition={effect === 'rise-words'
                                    ? { duration, ease: [0.25, 0.1, 0.25, 1] }
                                    : { duration }}
                            />
                        {/if}
                    {/snippet}
                </SvelteMarkdown>
            </div>
        </div>
    </div>
    <div class="sm-footer" role="status">
        {#if running}New text arrives every {cadence} ms. The opening passage stays visible.
        {:else if received === chunks.length}Story complete. Replay to compare another effect.
        {:else if received}Stream stopped. Replay starts a fresh story.
        {:else}Press Stream sample to add the next three paragraphs.{/if}
    </div>
</div>

<style>
    .sm-demo {
        min-width: 0;
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink);
        background: var(--brut-bg);
        text-align: left;
    }
    .sm-bar,
    .sm-output-label,
    .sm-footer {
        display: flex;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 8px;
        padding: 10px 16px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10px;
        line-height: 1.6;
        color: var(--brut-ink-3);
    }
    .sm-bar,
    .sm-comparison {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .sm-single {
        grid-template-columns: minmax(0, 1fr);
    }
    .sm-pane {
        min-width: 0;
    }
    .sm-pane + .sm-pane {
        border-left: 1px solid var(--brut-rule);
    }
    .sm-output-label {
        border-bottom: 1px solid var(--brut-rule);
        letter-spacing: 0.08em;
    }
    .sm-state {
        color: var(--brut-accent);
    }
    .sm-controls {
        padding: 18px 16px;
        border-bottom: 1px solid var(--brut-rule);
    }
    .sm-settings {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(100px, 1fr) minmax(100px, 1fr);
        gap: 20px;
        align-items: end;
    }
    .sm-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-width: 0;
        font-size: 11px;
        color: var(--brut-ink-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
    }
    .sm-field > span {
        display: flex;
        justify-content: space-between;
        gap: 8px;
    }
    .sm-value {
        color: var(--brut-ink-3);
        font-variant-numeric: tabular-nums;
    }
    .sm-field select {
        width: 100%;
        min-width: 0;
        height: 38px;
        padding: 0 8px;
        border: 1px solid var(--brut-rule);
        border-radius: 0;
        background: var(--brut-bg);
        color: var(--brut-ink);
        font: inherit;
    }
    .sm-field input[type='range'] {
        width: 100%;
        height: 38px;
        margin: 0;
        accent-color: var(--brut-accent);
    }
    .sm-toggle {
        display: flex;
        gap: 8px;
        align-items: center;
        min-height: 38px;
        font-size: 12px;
        color: var(--brut-ink-2);
    }
    .sm-toggle input {
        width: 14px;
        height: 14px;
        margin: 0;
        accent-color: var(--brut-accent);
    }
    .sm-description {
        margin: 10px 0 16px;
        font-size: 12px;
        line-height: 1.6;
        color: var(--brut-ink-3);
    }
    .sm-custom {
        display: grid;
        grid-template-columns: minmax(0, 1.5fr) minmax(120px, 1fr);
        gap: 20px;
        padding: 14px 0;
        margin-bottom: 14px;
        border-top: 1px solid var(--brut-rule);
        border-bottom: 1px solid var(--brut-rule);
    }
    .sm-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
    }
    .sm-actions button {
        appearance: none;
        padding: 9px 12px;
        border: 1px solid var(--brut-rule);
        border-radius: 0;
        background: var(--brut-bg);
        color: var(--brut-ink-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px;
        line-height: 1.5;
        cursor: pointer;
    }
    .sm-actions button:hover:not(:disabled) {
        border-color: var(--brut-accent);
        color: var(--brut-accent);
    }
    .sm-actions button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    .sm-actions .sm-primary {
        background: var(--brut-accent);
        border-color: var(--brut-accent);
        color: var(--brut-accent-ink);
        font-weight: 600;
    }
    .sm-actions .sm-primary:hover {
        background: var(--brut-accent-hover);
        color: var(--brut-accent-ink);
    }
    .sm-demo :is(button, select, input):focus-visible {
        outline: 2px solid var(--brut-accent);
        outline-offset: 3px;
    }
    .sm-motion-status {
        margin-left: auto;
        font-size: 11px;
        color: var(--brut-ink-3);
    }
    .sm-comparison {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .sm-single {
        grid-template-columns: minmax(0, 1fr);
    }
    .sm-pane {
        min-width: 0;
    }
    .sm-pane + .sm-pane {
        border-left: 1px solid var(--brut-rule);
    }
    .sm-output-label {
        background: var(--brut-bg-2);
    }
    .sm-output {
        padding: 24px 28px;
        min-height: 310px;
        font-size: 15px;
        line-height: 1.8;
        color: var(--brut-ink-2);
        overflow-wrap: anywhere;
    }
    .sm-output :global(h3) {
        margin: 0 0 12px;
        font-family: inherit;
        font-size: 21px;
        font-weight: 600;
        line-height: 1.3;
        letter-spacing: -0.02em;
        color: var(--brut-ink);
    }
    .sm-output :global(p) {
        margin: 0 0 18px;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
    }
    .sm-output :global(p:last-child) {
        margin-bottom: 0;
    }
    .sm-output :global(strong) {
        font-weight: 600;
        color: var(--brut-ink);
    }
    .sm-output :global(code) {
        padding: 2px 4px;
        background: var(--brut-bg-2);
        border: 1px solid var(--brut-rule);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
    }
    .sm-footer {
        border-top: 1px solid var(--brut-rule);
        letter-spacing: 0;
    }
    @media (max-width: 760px) {
        .sm-comparison {
            grid-template-columns: minmax(0, 1fr);
        }
        .sm-pane + .sm-pane {
            border-left: 0;
            border-top: 1px solid var(--brut-rule);
        }
    }
    @media (max-width: 600px) {
        .sm-settings,
        .sm-custom {
            grid-template-columns: minmax(0, 1fr);
            gap: 12px;
        }
        .sm-motion-status {
            width: 100%;
            margin: 4px 0 0;
        }
        .sm-output {
            padding: 20px 16px;
            font-size: 14px;
            min-height: 260px;
        }
        .sm-bar,
        .sm-output-label,
        .sm-footer {
            padding-inline: 16px;
        }
    }
</style>
