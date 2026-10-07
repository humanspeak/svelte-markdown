<script lang="ts">
    import SvelteMarkdown, { StreamingText } from '$lib/index.js'
    let markdown = $state<SvelteMarkdown>()
    let source = $state('Baseline ')
    let streamId = $state(0)
    let tracking = $state(true)
    let granularity = $state<'word' | 'grapheme'>('word')
    let patch = $state<SvelteMarkdown>()
    function restart() {
        source = 'Baseline '
        streamId++
        markdown?.resetStream(source)
    }
</script>

<h1>Streaming text fixture</h1>
<button onclick={() => markdown?.writeChunk("can't 👩‍💻 é ")}>Append</button>
<button onclick={restart}>Reset</button>
<button
    onclick={() => {
        source = '[label'
        markdown?.resetStream(source)
    }}>Seed link</button
>
<button onclick={() => markdown?.writeChunk('](https://example.com) label')}>Complete link</button>
<button
    onclick={() => {
        tracking = !tracking
    }}>Toggle tracking</button
>
<label
    >Granularity <select bind:value={granularity}
        ><option value="word">Word</option><option value="grapheme">Grapheme</option></select
    ></label
>
<div data-testid="output">
    <SvelteMarkdown bind:this={markdown} {source} {streamId} streaming streamingText={tracking}>
        {#snippet rawtext({ text, streamingText })}
            <StreamingText {text} metadata={streamingText} {granularity}>
                {#snippet segment(part)}
                    <span data-id={part.id} data-new={part.isNew} data-change={part.change}
                        >{part.text}</span
                    >
                {/snippet}
            </StreamingText>
        {/snippet}
    </SvelteMarkdown>
</div>
<div data-testid="isolated"><SvelteMarkdown source="Baseline " streaming streamingText /></div>
<div data-testid="ordinary"><SvelteMarkdown source="Ordinary **text**" streaming /></div>
<button onclick={() => patch?.writeChunk({ offset: 4, value: ' tail' })}>Offset tail</button>
<button onclick={() => patch?.writeChunk({ offset: 0, value: 'Head' })}>Offset fill</button>
<div data-testid="patch">
    <SvelteMarkdown bind:this={patch} source="" streaming streamingText>
        {#snippet rawtext({ text, streamingText })}
            <StreamingText {text} metadata={streamingText}>
                {#snippet segment(part)}<span data-new={part.isNew} data-change={part.change}
                        >{part.text}</span
                    >{/snippet}
            </StreamingText>
        {/snippet}
    </SvelteMarkdown>
</div>
