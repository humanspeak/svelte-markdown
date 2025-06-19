<script lang="ts">
    import SvelteMarkdown, { type Renderers, type Token, type TokensList } from '$lib/index.js'

    let source = `
# This should be the only text.

![image](https://avatars.githubusercontent.com/u/162604590?s=64&u=548f358e716a223731ab372776a09723cf815f4d&v=4)

<del>This is hidden.</del>

- Hello.

1. World.

| Table |
|-------|
| Cell |
`

    const parsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }

    const renderers: Partial<Renderers> = {
        image: null,
        html: {
            del: null
        },
        listitem: null,
        tablecell: null
    }
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview">
        <SvelteMarkdown {source} {renderers} {parsed} />
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
