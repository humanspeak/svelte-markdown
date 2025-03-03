<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const edgeCaseExamples = {
        empty: '',
        whitespace: '   \n   \t   ',
        // deeplyNested: Array(15)
        //     .fill(0)
        //     .map((_, i) => `${'*'.repeat(i + 1)} Level ${i}`)
        //     .join('\n'),
        /* eslint-disable */
        unicode: `# 你好，世界！
## مرحبا بالعالم
### Привет, мир!
#### ¡Hòla, món!
##### Zero-width space: [​]
###### Emojis: 🌈 🚀 🎨`,
        malformedHtml: `
<div>Unclosed div
<p>Nested <strong>unclosed tags <em>like this</p>
<script>alert('test')<\/script>
<img src="invalid" onerror="alert('xss')">
`
    }
    /* eslint-enable */

    let source = ''
    let selectedExample = 'empty'

    // Define type for the keys of edgeCaseExamples
    type ExampleKey = keyof typeof edgeCaseExamples
</script>

<div class="container">
    <div class="controls">
        <h2>Edge Case Tests</h2>
        <div class="buttons">
            {#each Object.entries(edgeCaseExamples) as [key, _], index (index)}
                <button
                    class:active={selectedExample === key}
                    onclick={() => {
                        selectedExample = key
                        source = edgeCaseExamples[key as ExampleKey]
                    }}
                >
                    {key}
                </button>
            {/each}
        </div>

        <textarea bind:value={source} data-testid="markdown-input" placeholder="Enter markdown here"
        ></textarea>
    </div>

    <div class="preview">
        <h2>Preview</h2>
        <div class="output" data-testid="markdown-output">
            <SvelteMarkdown {source} />
        </div>
    </div>
</div>

<style>
    .container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2rem;
        padding: 1rem;
        max-width: 1200px;
        margin: 0 auto;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    button {
        padding: 0.5rem 1rem;
        background: #4a5568;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
    }

    button:hover {
        background: #2d3748;
    }

    button.active {
        background: #2d3748;
        border: 2px solid #4a5568;
    }

    textarea {
        flex: 1;
        min-height: 400px;
        padding: 0.5rem;
        font-family: monospace;
        line-height: 1.4;
    }

    .preview {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .output {
        padding: 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
        min-height: 400px;
    }

    h2 {
        margin: 0;
        color: #2d3748;
    }
</style>
