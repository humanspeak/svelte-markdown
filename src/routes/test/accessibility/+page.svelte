<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const accessibilityTestMarkdown = `
# Main Document Title

## Section One
This is the first section with a [labeled link](https://example.com "Visit Example Site").

### Subsection 1.1
![Decorative image](/test-image-150.png "A placeholder image")

## Section Two
Here's a list of items:

- Item with [unlabeled link](https://example.com)
- Item with image ![](/test-image-50.png)
- Regular text item

### Subsection 2.1
More content here.

#### Deep Heading Level
Testing heading hierarchy.

## Section Three
Final section with various elements:

- Links
- Images
- Tables
- Lists
`

    let source = accessibilityTestMarkdown
</script>

<div class="container">
    <div class="editor">
        <h2>Markdown Editor</h2>
        <textarea bind:value={source} data-testid="markdown-input" aria-label="Markdown editor"
        ></textarea>
    </div>

    <div class="preview" data-testid="markdown-output">
        <h2>Preview</h2>
        <SvelteMarkdown {source} />
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

    .editor,
    .preview {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    textarea {
        min-height: 400px;
        padding: 1rem;
        font-family: monospace;
        line-height: 1.4;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    h2 {
        margin: 0;
        color: #2d3748;
    }
</style>
