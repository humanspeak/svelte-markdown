<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const markdownWithImages = `
# Image Lazy Loading Test

This page tests lazy loading functionality.

## Valid Image
![Test Image](/test-image-150.png "Test image title")

## Multiple Images
![Image 1](/test-image-50.png)
![Image 2](/test-image-150.png)
![Image 3](/test-image-50.png)

## Broken Image
![Broken](/non-existent-image.png "This should show error state")

## Text After Images
The images above should lazy load as you scroll.
`
</script>

<div class="container">
    <h1>Image Lazy Loading Tests</h1>
    <div class="markdown-output" data-testid="markdown-output">
        <SvelteMarkdown source={markdownWithImages} />
    </div>
</div>

<style>
    .container {
        padding: 2rem;
        max-width: 800px;
        margin: 0 auto;
    }

    .markdown-output {
        margin-top: 2rem;
    }
</style>
