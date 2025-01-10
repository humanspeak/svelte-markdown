<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    // Generate a large markdown document for performance testing
    const generateLargeMarkdown = () => {
        const sections = []
        for (let i = 0; i < 100; i++) {
            sections.push(`
# Section ${i}

## Subsection ${i}.1

${Array(10)
    .fill(0)
    .map(
        (_, j) => `
### Content Block ${i}.${j}

This is paragraph ${j} of section ${i}. It contains some **bold text** and *italic text*
and a [link to nowhere](https://example.com/${i}/${j}).

- List item 1
- List item 2
- List item 3

> Here's a blockquote for good measure.

\`\`\`javascript
// Some code
console.log('Section ${i}, Block ${j}');
\`\`\`
`
    )
    .join('\n')}
`)
        }
        return sections.join('\n')
    }

    let source = ''
    const largeMarkdown = generateLargeMarkdown()
</script>

<div class="container">
    <div class="controls">
        <button on:click={() => (source = largeMarkdown)} class="load-btn">
            Load Large Document
        </button>

        <textarea bind:value={source} data-testid="markdown-input" placeholder="Enter markdown here"
        ></textarea>
    </div>

    <div class="preview" data-testid="large-markdown">
        <SvelteMarkdown {source} />
    </div>
</div>

<style>
    .container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        padding: 1rem;
        height: 100vh;
    }

    .controls {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .load-btn {
        padding: 0.5rem 1rem;
        background: #4a5568;
        color: white;
        border: none;
        border-radius: 0.25rem;
        cursor: pointer;
    }

    .load-btn:hover {
        background: #2d3748;
    }

    textarea {
        flex: 1;
        min-height: 200px;
        padding: 0.5rem;
        font-family: monospace;
    }

    .preview {
        padding: 0.5rem;
        overflow-y: auto;
        border: 1px solid #e2e8f0;
        border-radius: 0.25rem;
    }
</style>
