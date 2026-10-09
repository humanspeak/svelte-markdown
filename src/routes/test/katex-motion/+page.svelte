<script lang="ts">
    import { onMount, tick } from 'svelte'
    import { KatexRenderer, markedKatex } from '$lib/extensions/katex/index.js'
    import type { KatexSnippetProps } from '$lib/extensions/index.js'
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import { Fade, RiseWords } from '$lib/streaming/motion/index.js'

    const answers = {
        'With math':
            'The quadratic formula solves $ax^2 + bx + c = 0$ for any coefficients:\n\n$$\nx = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}\n$$\n\nThe text around the math rises in, and each formula fades in once as it arrives. Euler wrote $e^{i\\pi} + 1 = 0$ and moved on.',
        'Structure changes':
            'Euler wrote $e^{i\\pi} + 1 = 0$ and moved on\n===\n\nThen a list:\n\nThe sum $a+b$ here\n- item',
        'No math':
            'Streaming answers should feel **alive**. Every word in this reply should rise into place, even though the KaTeX extension is loaded.\n\n- Lists animate too\n- And so do `inline code` neighbours\n\nNothing here is math, so nothing should be static.'
    }
    type Answer = keyof typeof answers

    const extensions = [markedKatex({ singleDollarInline: true })]

    let answer = $state<Answer>('With math')
    let source = $state('')
    let streamId = $state(0)
    let outputId = $state(0)
    let running = $state(false)
    let timer: ReturnType<typeof setInterval> | undefined

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
        void stream()
        return stop
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

{#snippet math({ text, displayMode, streamingText }: KatexSnippetProps)}
    <Fade {streamingText} block={displayMode}><KatexRenderer {text} {displayMode} /></Fade>
{/snippet}

<main>
    <h1>KaTeX extension + streaming entrances</h1>
    <p>
        Both panes load <code>markedKatex</code> and use <code>RiseWords</code>. The left pane
        streams the answer, so its text should rise in and its math should fade in. The right pane
        receives the whole answer at once, as on a page refresh, so neither text nor math in it
        should animate. <em>Structure changes</em> turns paragraphs holding math into a heading and back;
        each formula should still fade in only once.
    </p>
    <div class="toolbar">
        <select bind:value={answer} disabled={running}>
            {#each Object.keys(answers) as name (name)}<option>{name}</option>{/each}
        </select>
        <button onclick={stream}>{running ? 'Restart stream' : 'Stream again'}</button>
        <button onclick={() => outputId++}>Re-mount output</button>
    </div>
    <div class="panes">
        <section data-testid="streaming">
            <h2>Streaming</h2>
            <div class="output">
                {#key streamId}
                    <SvelteMarkdown
                        {source}
                        streaming
                        streamingText
                        {extensions}
                        inlineKatex={math}
                        blockKatex={math}
                    >
                        {#snippet rawtext({ text, streamingText })}<span
                                class:unknown={streamingText?.provenance !== 'exact'}
                                ><RiseWords {text} {streamingText} /></span
                            >{/snippet}
                    </SvelteMarkdown>
                {/key}
            </div>
        </section>
        <section data-testid="already-output">
            <h2>Already output</h2>
            <div class="output">
                {#key `${answer}:${outputId}`}
                    <SvelteMarkdown
                        source={answers[answer]}
                        streaming
                        streamingText
                        {extensions}
                        inlineKatex={math}
                        blockKatex={math}
                    >
                        {#snippet rawtext({ text, streamingText })}<span
                                class:unknown={streamingText?.provenance !== 'exact'}
                                ><RiseWords {text} {streamingText} /></span
                            >{/snippet}
                    </SvelteMarkdown>
                {/key}
            </div>
        </section>
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
