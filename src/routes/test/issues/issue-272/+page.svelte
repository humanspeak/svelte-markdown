<script lang="ts">
    import SvelteMarkdown, { type Token, type TokensList } from '$lib/index.js'

    let source = $state(`# Issue 272: Markdown-native XSS vectors

Reported by **@ShinonomeNoAlice**

## The Problem

Input-level HTML sanitizers like DOMPurify operate on HTML, not Markdown syntax.
Markdown-native constructs pass through untouched, then Marked parses them into exploitable DOM elements.

## Exploit Vectors

### 1. javascript: protocol
[Click for XSS](javascript:alert('XSS-basic'))

### 2. Mixed case bypass
[Click for XSS](JaVaScRiPt:alert('XSS-mixed'))

### 3. data: URI
[Click for XSS](data:text/html,${'<script>'}alert('XSS-data')${'<' + '/script>'})

### 4. Image src injection
![XSS image](javascript:alert('XSS-img'))

### 5. Safe link for comparison
[Safe link](https://example.com)
`)

    const parsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview" data-testid="preview">
        <SvelteMarkdown {source} {parsed} />
    </div>
</div>

<style>
    .container {
        display: flex;
        gap: 1rem;
        width: 100%;
    }

    textarea {
        width: 50%;
        min-height: 300px;
        padding: 1rem;
        font-family: monospace;
    }

    .preview {
        width: 50%;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
</style>
