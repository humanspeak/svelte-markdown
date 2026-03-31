<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import type { StreamingChunk } from '$lib/types.js'
    import type { MarkedExtension } from 'marked'

    interface ImperativeMarkdownHandle {
        writeChunk: (_chunk: StreamingChunk) => void
        resetStream: (_nextSource?: string) => void
    }

    let appendSource = $state('')
    let offsetSource = $state('')
    let asyncSource = $state('')

    let appendMarkdown: ImperativeMarkdownHandle | undefined = $state()
    let offsetMarkdown: ImperativeMarkdownHandle | undefined = $state()
    let asyncMarkdown: ImperativeMarkdownHandle | undefined = $state()

    const asyncUppercaseCode = (): MarkedExtension => ({
        async: true,
        async walkTokens() {
            return Promise.resolve()
        }
    })

    const asyncExtensions = [asyncUppercaseCode()]

    const writeAppend = (chunk: string) => {
        appendMarkdown?.writeChunk(chunk)
    }

    const writeOffset = (chunk: StreamingChunk) => {
        offsetMarkdown?.writeChunk(chunk)
    }
</script>

<svelte:head>
    <title>Imperative Streaming Test</title>
</svelte:head>

<div class="page" data-testid="imperative-streaming-page">
    <section class="panel">
        <h2>Append Mode</h2>
        <div class="controls">
            <button data-testid="append-write-hello" onclick={() => writeAppend('Hello')}>
                Write Hello
            </button>
            <button data-testid="append-write-space" onclick={() => writeAppend(' ')}>
                Write Space
            </button>
            <button data-testid="append-write-world" onclick={() => writeAppend('World')}>
                Write World
            </button>
            <button
                data-testid="append-try-offset"
                onclick={() => appendMarkdown?.writeChunk({ value: 'X', offset: 0 })}
            >
                Try Offset Chunk
            </button>
            <button data-testid="append-reset" onclick={() => appendMarkdown?.resetStream()}>
                Reset Stream
            </button>
            <button
                data-testid="append-reset-seed"
                onclick={() => appendMarkdown?.resetStream('# Seed')}
            >
                Reset With Seed
            </button>
            <button data-testid="append-prop-reset" onclick={() => (appendSource = '# Prop Seed')}>
                Reset Via Source Prop
            </button>
            <button data-testid="append-write-tail" onclick={() => writeAppend('\n\nTail')}>
                Append Tail
            </button>
        </div>
        <div class="preview" data-testid="append-preview">
            <SvelteMarkdown bind:this={appendMarkdown} source={appendSource} streaming />
        </div>
    </section>

    <section class="panel">
        <h2>Offset Mode</h2>
        <div class="controls">
            <button data-testid="offset-reset" onclick={() => offsetMarkdown?.resetStream()}>
                Reset Stream
            </button>
            <button
                data-testid="offset-write-hello"
                onclick={() => writeOffset({ value: 'Hello', offset: 0 })}
            >
                Write Hello
            </button>
            <button
                data-testid="offset-write-tail"
                onclick={() => writeOffset({ value: ' World', offset: 5 })}
            >
                Write Tail
            </button>
            <button
                data-testid="offset-gap"
                onclick={() => {
                    offsetMarkdown?.resetStream()
                    writeOffset({ value: 'ab', offset: 0 })
                    writeOffset({ value: 'XY', offset: 4 })
                }}
            >
                Write Gapped Chunk
            </button>
            <button
                data-testid="offset-overwrite"
                onclick={() => writeOffset({ value: 'Z', offset: 2 })}
            >
                Overwrite Index 2
            </button>
            <button
                data-testid="offset-try-append"
                onclick={() => offsetMarkdown?.writeChunk('tail')}
            >
                Try String Chunk
            </button>
            <button data-testid="offset-prop-reset" onclick={() => (offsetSource = 'Seed')}>
                Reset Via Source Prop
            </button>
        </div>
        <div class="preview" data-testid="offset-preview">
            <SvelteMarkdown bind:this={offsetMarkdown} source={offsetSource} streaming />
        </div>
    </section>

    <section class="panel">
        <h2>Async Extension Guard</h2>
        <div class="controls">
            <button data-testid="async-write" onclick={() => asyncMarkdown?.writeChunk('# Noop')}>
                Attempt Async Write
            </button>
        </div>
        <div class="preview" data-testid="async-preview">
            <SvelteMarkdown
                bind:this={asyncMarkdown}
                source={asyncSource}
                streaming
                extensions={asyncExtensions}
            />
        </div>
    </section>
</div>

<style>
    .page {
        display: grid;
        gap: 1.5rem;
        padding: 1.5rem;
    }

    .panel {
        border: 1px solid #d4d4d8;
        border-radius: 0.75rem;
        padding: 1rem;
        background: #fff;
    }

    .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    button {
        border: 1px solid #18181b;
        border-radius: 999px;
        background: #18181b;
        color: #fff;
        padding: 0.5rem 0.9rem;
        cursor: pointer;
    }

    .preview {
        min-height: 4rem;
        padding: 1rem;
        border-radius: 0.5rem;
        background: #f4f4f5;
        white-space: pre-wrap;
    }
</style>
