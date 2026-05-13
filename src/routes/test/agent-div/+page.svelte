<script lang="ts">
    import { default as SvelteMarkdown, type Token, type TokensList } from '$lib/index.js'

    // The exact problem markup from the agent-output demo
    const NESTED = `<div style="background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; border-left: 4px solid #3dbba0">
<strong>Verdict:</strong> ship it
<ul>
<li>URL allowlist covers all dangerous protocols</li>
<li>Event handlers stripped before render</li>
<li>Streaming-aware — sanitizes per token, not per document</li>
</ul>
</div>`

    // Same content, just the <ul> (no enclosing <div>)
    const UL_ONLY = `<ul>
<li>URL allowlist covers all dangerous protocols</li>
<li>Event handlers stripped before render</li>
<li>Streaming-aware — sanitizes per token, not per document</li>
</ul>`

    // <div> with just text + <strong>, no nested <ul>
    const DIV_INLINE = `<div style="background: #1e293b; color: #e2e8f0; padding: 16px">
<strong>Verdict:</strong> ship it
</div>`

    // <div> with <strong> AND a <ul>, but minimal whitespace
    const DIV_UL_TIGHT = `<div style="background: #1e293b; color: #e2e8f0; padding: 16px"><strong>Verdict:</strong> ship it<ul><li>a</li><li>b</li></ul></div>`

    let case1Tokens = $state<unknown>(null)
    let case2Tokens = $state<unknown>(null)
    let case3Tokens = $state<unknown>(null)
    let case4Tokens = $state<unknown>(null)

    const logTokens = (target: 'c1' | 'c2' | 'c3' | 'c4') => (tokens: Token[] | TokensList) => {
        const snapshot = JSON.parse(JSON.stringify(tokens))
        if (target === 'c1') case1Tokens = snapshot
        else if (target === 'c2') case2Tokens = snapshot
        else if (target === 'c3') case3Tokens = snapshot
        else case4Tokens = snapshot
    }

    // Streaming cases — write the content in word-sized chunks
    interface StreamingHandle {
        writeChunk: (_chunk: string) => void
        resetStream: (_next?: string) => void
    }
    let streamA: StreamingHandle | undefined = $state()
    let streamB: StreamingHandle | undefined = $state()

    const cancels: Array<() => void> = []
    const cancelActiveStreams = () => {
        while (cancels.length) cancels.pop()?.()
    }

    const streamInto = (handle: StreamingHandle | undefined, content: string) => {
        if (!handle) return
        handle.resetStream('')
        const chunks = content.match(/\S+\s*/g) ?? []
        let i = 0
        let timer: ReturnType<typeof setTimeout> | null = null
        let cancelled = false
        const cancel = () => {
            cancelled = true
            if (timer !== null) {
                clearTimeout(timer)
                timer = null
            }
        }
        cancels.push(cancel)
        const tick = () => {
            if (cancelled || i >= chunks.length) return
            handle.writeChunk(chunks[i++])
            timer = setTimeout(tick, 20)
        }
        tick()
    }

    const startStreams = () => {
        cancelActiveStreams()
        streamInto(streamA, NESTED)
        streamInto(streamB, DIV_UL_TIGHT)
    }
</script>

<svelte:head>
    <!-- Internal repro fixture for #291. Lives under /test/* like the
         rest of the dev-only routes; intentionally has no canonical URL
         and is excluded from production indexing. -->
    <title>Agent DIV repro</title>
    <meta name="robots" content="noindex,nofollow" />
    <style>
        body {
            font-family: system-ui, sans-serif;
            max-width: 1100px;
            margin: 2rem auto;
            padding: 0 1rem;
            color: #1a1a1a;
            background: #fafafa;
        }
        h1 {
            font-size: 1.4rem;
        }
        h2 {
            font-size: 1.05rem;
            margin-top: 2rem;
            color: #555;
        }
        .case {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 1rem;
            margin: 1rem 0;
            background: white;
        }
        .case h3 {
            margin-top: 0;
            font-size: 0.95rem;
            font-family: ui-monospace, monospace;
            color: #0066cc;
        }
        details {
            margin-top: 0.5rem;
        }
        pre {
            font-size: 0.7rem;
            background: #f4f4f4;
            padding: 0.5rem;
            overflow: auto;
            max-height: 12rem;
            margin: 0.25rem 0 0;
        }
        .source-box {
            background: #f4f4f4;
            padding: 0.5rem;
            font-family: ui-monospace, monospace;
            font-size: 0.75rem;
            white-space: pre-wrap;
            border-radius: 4px;
        }
        .render-box {
            border: 2px dashed #0066cc;
            padding: 0.75rem;
            margin-top: 0.5rem;
            background: white;
        }
    </style>
</svelte:head>

<h1>Agent DIV repro — isolating the nested HTML bug</h1>

<p>
    Four cases. The bug claim is that the styled <code>&lt;div&gt;</code> in case 1 renders empty in the
    DOM while its children render outside it. Each case logs its token tree on parse so we can see exactly
    what the cleanup pipeline produced.
</p>

<section class="case">
    <h3>Case 1 — &lt;div&gt; with &lt;strong&gt; + &lt;ul&gt;/&lt;li&gt; children (THE BUG)</h3>
    <div class="source-box">{NESTED}</div>
    <div class="render-box">
        <SvelteMarkdown source={NESTED} parsed={logTokens('c1')} />
    </div>
    <details>
        <summary>Parsed tokens</summary>
        <pre>{JSON.stringify(case1Tokens, null, 2)}</pre>
    </details>
</section>

<section class="case">
    <h3>Case 2 — &lt;ul&gt;/&lt;li&gt; alone (no enclosing &lt;div&gt;)</h3>
    <div class="source-box">{UL_ONLY}</div>
    <div class="render-box">
        <SvelteMarkdown source={UL_ONLY} parsed={logTokens('c2')} />
    </div>
    <details>
        <summary>Parsed tokens</summary>
        <pre>{JSON.stringify(case2Tokens, null, 2)}</pre>
    </details>
</section>

<section class="case">
    <h3>Case 3 — &lt;div&gt; with only inline content (&lt;strong&gt;, no &lt;ul&gt;)</h3>
    <div class="source-box">{DIV_INLINE}</div>
    <div class="render-box">
        <SvelteMarkdown source={DIV_INLINE} parsed={logTokens('c3')} />
    </div>
    <details>
        <summary>Parsed tokens</summary>
        <pre>{JSON.stringify(case3Tokens, null, 2)}</pre>
    </details>
</section>

<section class="case">
    <h3>Case 4 — &lt;div&gt;&lt;strong&gt;&lt;ul&gt;&lt;li&gt; tight (no newlines inside)</h3>
    <div class="source-box">{DIV_UL_TIGHT}</div>
    <div class="render-box">
        <SvelteMarkdown source={DIV_UL_TIGHT} parsed={logTokens('c4')} />
    </div>
    <details>
        <summary>Parsed tokens</summary>
        <pre>{JSON.stringify(case4Tokens, null, 2)}</pre>
    </details>
</section>

<h2>Streaming-mode cases</h2>

<p>
    SSR (cases 1-4 above) all render correctly. These two cases use
    <code>streaming=&#123;true&#125;</code> + <code>writeChunk()</code> to mimic the agent-output demo.
    If they render differently from cases 1 and 4, the bug is in streaming.
</p>

<button onclick={startStreams} style="margin: 0.5rem 0; padding: 0.5rem 1rem"
    >Start streaming</button
>

<section class="case">
    <h3>Case 5 — streaming Case 1 (NESTED, with newlines)</h3>
    <div class="render-box">
        <SvelteMarkdown bind:this={streamA} source="" streaming={true} />
    </div>
</section>

<section class="case">
    <h3>Case 6 — streaming Case 4 (DIV_UL_TIGHT, no inner newlines)</h3>
    <div class="render-box">
        <SvelteMarkdown bind:this={streamB} source="" streaming={true} />
    </div>
</section>
