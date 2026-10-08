<script lang="ts">
    import { onMount, tick } from 'svelte'
    import SvelteMarkdown from '$lib/index.js'
    import { FadeWords, RiseWords, FadeCharacters } from '$lib/streaming/motion/index.js'
    import SoftFadeRise from './SoftFadeRise.svelte'

    const baseline = 'The notebook is already open. '
    const passages = [
        "We can't hurry the morning. 👩‍💻 brings a café greeting, é carries its accent, and  two spaces stay together. ",
        '\n\nA **new thought** gets a little *lift*. The story continues while `const greeting = "Hello, 世界"` stays plain.'
    ]
    const effects = [
        { name: 'Plain', component: undefined, description: 'The library default. No animation.' },
        { name: 'FadeWords', component: FadeWords, description: 'A gentle fade for each word.' },
        { name: 'RiseWords', component: RiseWords, description: 'Words fade and lift into place.' },
        {
            name: 'FadeCharacters',
            component: FadeCharacters,
            description: 'A fade for each letter or whole emoji.'
        }
    ]
    let source = $state(baseline)
    let streamId = $state(0)
    let duration = $state(0.18)
    let softFadeRise = $state(false)
    let lift = $state(8)
    let liftDuration = $state(0.4)
    let fadeDuration = $state(0.65)
    let ink = $state(false)
    let inkDuration = $state(0.6)
    let fadeWordsTrial = $state(false)
    let fadeWordsLift = $state(0)
    let fadeWordsLiftDuration = $state(0.4)
    let fadeWordsFadeDuration = $state(0.65)
    let fadeWordsInk = $state(false)
    let fadeWordsInkDuration = $state(0.6)
    let chunkMode = $state('word')
    let disabled = $state(false)
    let reducedMotion = $state(true)
    let ready = $state(false)
    let received = $state(0)
    let running = $state(false)
    let timer: ReturnType<typeof setInterval> | undefined
    const enabled = $derived(!disabled && !reducedMotion)

    function stop() {
        clearInterval(timer)
        timer = undefined
        running = false
    }
    function reset() {
        stop()
        streamId++
        source = baseline
        received = 0
    }
    function append() {
        stop()
        if (received < passages.length) source += passages[received++]
    }
    async function replay() {
        reset()
        const epoch = streamId
        await tick()
        if (epoch !== streamId || !ready) return
        const words = passages.join('').match(/\S+\s*/gu) ?? []
        // Fragment mode models partial tokens without slicing a Unicode grapheme.
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
        const chunks =
            chunkMode === 'word'
                ? words
                : words.flatMap((word) => {
                      const parts = Array.from(segmenter.segment(word), (part) => part.segment)
                      const split = Math.ceil(parts.length / 2)
                      return [parts.slice(0, split).join(''), parts.slice(split).join('')].filter(
                          Boolean
                      )
                  })
        let index = 0
        running = true
        timer = setInterval(
            () => {
                source += chunks[index++]
                if (index === chunks.length) {
                    received = passages.length
                    stop()
                }
            },
            chunkMode === 'word' ? 100 : 50
        )
    }
    onMount(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => {
            reducedMotion = query.matches
        }
        update()
        ready = true
        query.addEventListener('change', update)
        return () => {
            ready = false
            query.removeEventListener('change', update)
            stop()
        }
    })
</script>

<svelte:head><title>Streaming motion — preset comparison</title></svelte:head>
<main>
    <header>
        <p class="eyebrow">OPTIONAL MOTION / PRESET COMPARISON</p>
        <h1>Watch the words arrive.</h1>
        <p>
            Compare three explicitly imported effects on the same markdown. The opening sentence is
            already visible; only arriving text animates.
        </p>
    </header>
    <section class="controls" aria-label="Stream controls">
        <div class="settings">
            <label
                >Duration (seconds)<input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    bind:value={duration}
                /></label
            >
            <label
                >Chunk shape<select bind:value={chunkMode} disabled={running}
                    ><option value="word">Whole words · 100 ms</option><option value="fragment"
                        >Partial words · 50 ms</option
                    ></select
                ></label
            >
            <label class="toggle"
                ><input type="checkbox" bind:checked={disabled} /> Disable motion</label
            >
            <span data-testid="motion-preference"
                >{reducedMotion
                    ? 'System reduced motion · animation off'
                    : disabled
                      ? 'Motion disabled'
                      : 'Motion enabled'}</span
            >
        </div>
        <div class="actions">
            <button class="primary" onclick={replay} disabled={!ready}
                >Stream / Replay sample</button
            >
            <button onclick={append} disabled={!ready || running || received === passages.length}
                >Append passage</button
            >
            <button onclick={stop} disabled={!running}>Stop</button>
            <button onclick={reset} disabled={!ready}>Reset</button>
        </div>
        <p role="status">
            {running
                ? 'Streaming the story…'
                : received === passages.length
                  ? 'Complete. Replay to watch another entrance.'
                  : 'Stream the sample, or append one passage at a time.'}
        </p>
    </section>
    <div class="comparison">
        {#each effects as effect (effect.name)}
            <article aria-label={`${effect.name} comparison`}>
                <div class="caption">
                    <h2>{effect.name}</h2>
                    <p>{effect.description}</p>
                    {#if effect.name === 'FadeWords'}
                        <label class="toggle trial-toggle"
                            ><input type="checkbox" bind:checked={fadeWordsTrial} /> FadeWords soft lift
                            and fade trial</label
                        >
                        {#if fadeWordsTrial}
                            <p class="trial-note">
                                Consumer trial: separate timings below replace Duration (seconds)
                                for this pane. Replay to compare new arrivals.
                            </p>
                            <div class="settings trial-settings">
                                <label
                                    >Lift (pixels)<input
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.5"
                                        bind:value={fadeWordsLift}
                                    /></label
                                >
                                <label
                                    >Lift duration (seconds)<input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.01"
                                        bind:value={fadeWordsLiftDuration}
                                    /></label
                                >
                                <label
                                    >Fade duration (seconds)<input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.01"
                                        bind:value={fadeWordsFadeDuration}
                                    /></label
                                >
                                <label class="toggle"
                                    ><input type="checkbox" bind:checked={fadeWordsInk} /> Ink wipe</label
                                >
                                {#if fadeWordsInk}
                                    <label
                                        >Ink duration (seconds)<input
                                            type="number"
                                            min="0"
                                            max="5"
                                            step="0.01"
                                            bind:value={fadeWordsInkDuration}
                                        /></label
                                    >
                                {/if}
                            </div>
                        {/if}
                    {/if}
                    {#if effect.name === 'RiseWords'}
                        <label class="toggle trial-toggle"
                            ><input type="checkbox" bind:checked={softFadeRise} /> Custom soft fade/rise
                            trial</label
                        >
                        {#if softFadeRise}
                            <p class="trial-note">
                                Consumer trial: separate timings below replace Duration (seconds)
                                for this pane. Replay to compare new arrivals.
                            </p>
                            <div class="settings trial-settings">
                                <label
                                    >Lift (pixels)<input
                                        type="number"
                                        min="0"
                                        max="20"
                                        step="0.5"
                                        bind:value={lift}
                                    /></label
                                >
                                <label
                                    >Lift duration (seconds)<input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.01"
                                        bind:value={liftDuration}
                                    /></label
                                >
                                <label
                                    >Fade duration (seconds)<input
                                        type="number"
                                        min="0"
                                        max="5"
                                        step="0.01"
                                        bind:value={fadeDuration}
                                    /></label
                                >
                                <label class="toggle"
                                    ><input type="checkbox" bind:checked={ink} /> Ink wipe</label
                                >
                                {#if ink}
                                    <label
                                        >Ink duration (seconds)<input
                                            type="number"
                                            min="0"
                                            max="5"
                                            step="0.01"
                                            bind:value={inkDuration}
                                        /></label
                                    >
                                {/if}
                            </div>
                        {/if}
                    {/if}
                </div>
                <div class="output" data-testid={effect.name}>
                    <SvelteMarkdown {source} {streamId} streaming streamingText>
                        {#snippet rawtext({ text, streamingText })}
                            {#if effect.name === 'RiseWords' && softFadeRise}
                                <SoftFadeRise
                                    {text}
                                    {streamingText}
                                    {enabled}
                                    {lift}
                                    {liftDuration}
                                    {fadeDuration}
                                    {ink}
                                    {inkDuration}
                                />
                            {:else if effect.name === 'FadeWords' && fadeWordsTrial}
                                <SoftFadeRise
                                    {text}
                                    {streamingText}
                                    {enabled}
                                    lift={fadeWordsLift}
                                    liftDuration={fadeWordsLiftDuration}
                                    fadeDuration={fadeWordsFadeDuration}
                                    ink={fadeWordsInk}
                                    inkDuration={fadeWordsInkDuration}
                                />
                            {:else if effect.component}<effect.component
                                    {text}
                                    {streamingText}
                                    {enabled}
                                    transition={duration === 0.18
                                        ? undefined
                                        : { duration, ease: 'linear' }}
                                />{:else}{text}{/if}
                        {/snippet}
                    </SvelteMarkdown>
                </div>
            </article>
        {/each}
    </div>
</main>

<style>
    main {
        --ink: #192b28;
        --muted: #56635f;
        --rule: #d3ddd8;
        --accent: #145e50;
        max-width: 1120px;
        margin: 0 auto;
        padding: 48px 24px;
        font-family: system-ui, sans-serif;
        color: var(--ink);
        line-height: 1.7;
    }
    header {
        max-width: 720px;
        margin-bottom: 28px;
    }
    h1 {
        margin: 8px 0;
        font-size: clamp(28px, 5vw, 44px);
        line-height: 1.2;
        letter-spacing: -0.04em;
    }
    header p {
        color: var(--muted);
    }
    .eyebrow,
    .caption h2 {
        font:
            12px ui-monospace,
            monospace;
        letter-spacing: 0.08em;
    }
    .controls {
        padding: 20px;
        border: 1px solid var(--rule);
        background: #f6f8f6;
    }
    .settings,
    .actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 14px;
    }
    .settings {
        margin-bottom: 16px;
        font-size: 13px;
    }
    label {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
    }
    select {
        max-width: 100%;
        padding: 8px;
        border: 1px solid var(--rule);
        background: white;
        font: inherit;
    }
    input[type='number'] {
        width: 70px;
        padding: 8px;
        border: 1px solid var(--rule);
        background: white;
        font: inherit;
    }
    input[type='checkbox'] {
        accent-color: var(--accent);
    }
    button {
        padding: 10px 14px;
        border: 1px solid var(--rule);
        border-radius: 0;
        background: white;
        color: var(--ink);
        font:
            12px ui-monospace,
            monospace;
        cursor: pointer;
    }
    button.primary {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
    }
    button:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    :is(button, input):focus-visible {
        outline: 2px solid var(--accent);
        outline-offset: 3px;
    }
    .controls p {
        margin: 14px 0 0;
        font-size: 12px;
        color: var(--muted);
    }
    .comparison {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        border-left: 1px solid var(--rule);
    }
    article {
        min-width: 0;
        border-right: 1px solid var(--rule);
        border-bottom: 1px solid var(--rule);
    }
    .caption {
        padding: 16px 20px;
        border-bottom: 1px solid var(--rule);
    }
    .caption h2 {
        margin: 0 0 8px;
        font-weight: 600;
    }
    .caption p {
        margin: 0;
        font-size: 12px;
        color: var(--muted);
    }
    .trial-toggle {
        margin-top: 12px;
        font-size: 13px;
    }
    .caption .trial-note {
        margin-top: 10px;
    }
    .trial-settings {
        margin: 12px 0 0;
    }
    .output {
        padding: 20px;
        min-height: 240px;
        font-size: 16px;
        overflow-wrap: anywhere;
    }
    .output :global(p) {
        margin: 0 0 16px;
    }
    .output :global(code) {
        background: #edf1ee;
        padding: 2px 4px;
        font:
            12px ui-monospace,
            monospace;
    }
    @media (max-width: 760px) {
        main {
            padding: 28px 16px;
        }
        .comparison {
            grid-template-columns: minmax(0, 1fr);
        }
        .output {
            min-height: 140px;
        }
    }
</style>
