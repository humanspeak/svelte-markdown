<script lang="ts">
    import { onMount, tick } from 'svelte'
    import { markedKatex } from '$lib/extensions/katex/index.js'
    import FadeKatex from './FadeKatex.svelte'
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { RiseWords } from '$lib/streaming/motion/index.js'

    const answers = {
        'No math':
            'Streaming answers should feel **alive**. Every word in this reply should rise into place, even though the KaTeX extension is loaded on the right.\n\n- Lists animate too\n- And so do `inline code` neighbours\n\nNothing here is math, so nothing should be static.',
        'With math':
            'The quadratic formula solves $ax^2 + bx + c = 0$ for any coefficients:\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n\nThe text around the math keeps animating, while the formulas themselves appear without an entrance. Euler wrote $e^{i\\pi} + 1 = 0$ and moved on.'
    }
    type Answer = keyof typeof answers

    const extensions = [markedKatex({ singleDollarInline: true })]
    const panes = [
        { name: 'No extensions', extensions: [] },
        { name: 'markedKatex loaded', extensions }
    ]

    let answer = $state<Answer>('No math')
    let source = $state('')
    let streamId = $state(0)
    let running = $state(false)
    let timer: ReturnType<typeof setInterval> | undefined
    let motionOn = $state(true)
    let reducedMotion = $state(false)
    // One switch for text and math, exactly like the enabled flag passed to RiseWords.
    const enabled = $derived(motionOn && !reducedMotion)

    function stop() {
        clearInterval(timer)
        timer = undefined
        running = false
    }
    async function stream() {
        stop()
        streamId++
        source = ''
        await tick()
        const chunks = answers[answer].match(/\S+\s*/gu) ?? []
        let index = 0
        running = true
        timer = setInterval(() => {
            source += chunks[index++]
            if (index === chunks.length) stop()
        }, 80)
    }
    onMount(() => {
        const query = window.matchMedia('(prefers-reduced-motion: reduce)')
        const update = () => (reducedMotion = query.matches)
        update()
        query.addEventListener('change', update)
        void stream()
        return () => {
            query.removeEventListener('change', update)
            stop()
        }
    })
</script>

<svelte:head>
    <title>KaTeX + streaming motion</title>
    <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.45/dist/katex.min.css"
        crossorigin="anonymous"
    />
</svelte:head>

<main>
    <h1>KaTeX extension + streaming entrances</h1>
    <p>
        Both panes stream the same answer with <code>RiseWords</code>. Before the fix, the right
        pane rendered every word statically because loading any extension marked the whole parse as
        <code>provenance: 'unknown'</code>.
    </p>
    <div class="toolbar">
        <select bind:value={answer} disabled={running}>
            {#each Object.keys(answers) as name (name)}<option>{name}</option>{/each}
        </select>
        <button onclick={stream}>{running ? 'Restart' : 'Stream / Replay'}</button>
        <label><input type="checkbox" bind:checked={motionOn} /> Motion</label>
        <span class="status"
            >{reducedMotion
                ? 'System reduced motion · animation off'
                : enabled
                  ? 'Text rises · math fades'
                  : 'Motion off · text and math appear instantly'}</span
        >
    </div>
    <div class="panes">
        {#each panes as pane (pane.name)}
            <section data-testid={pane.name}>
                <h2>{pane.name}</h2>
                <div class="output">
                    {#key streamId}
                        <SvelteMarkdown
                            {source}
                            streaming
                            streamingText
                            extensions={pane.extensions}
                        >
                            {#snippet rawtext({ text, streamingText })}<span
                                    class:unknown={streamingText?.provenance !== 'exact'}
                                    ><RiseWords {text} {streamingText} {enabled} /></span
                                >{/snippet}
                            {#snippet inlineKatex({ text }: { text: string })}<FadeKatex
                                    {text}
                                    {enabled}
                                />{/snippet}
                            {#snippet blockKatex({ text }: { text: string })}<FadeKatex
                                    {text}
                                    {enabled}
                                    displayMode
                                />{/snippet}
                        </SvelteMarkdown>
                    {/key}
                </div>
            </section>
        {/each}
    </div>
    <p class="legend">
        <span class="unknown">Red underline</span> = unknown provenance (no entrance).
    </p>
</main>

<style>
    main {
        max-width: 1100px;
        margin: 0 auto;
        padding: 32px 24px;
        font-family: system-ui, sans-serif;
        line-height: 1.7;
    }
    .toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        margin: 16px 0;
    }
    .panes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 24px;
    }
    .status {
        font-size: 13px;
        color: #56635f;
    }
    section {
        border: 1px solid #d3ddd8;
        padding: 16px 20px;
    }
    h2 {
        margin: 0;
        font-size: 14px;
        font-family: ui-monospace, monospace;
    }
    .output {
        min-height: 320px;
    }
    .unknown {
        text-decoration: underline wavy #c0392b;
    }
</style>
