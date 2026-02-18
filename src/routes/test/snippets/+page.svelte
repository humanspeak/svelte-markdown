<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    let source = $state(`# Heading Level 1

A paragraph with **bold**, *italic*, and [a link](https://example.com "tooltip").

> A blockquote with **nested bold**

- List item one
- List item two
- List item three

\`\`\`javascript
const x = 42
\`\`\`

![An image](/test.png "Image title")

| Header A | Header B |
|----------|----------|
| Cell 1   | Cell 2   |

<div class="html-test">HTML div content</div>
<a href="https://example.com">HTML anchor</a>
`)
</script>

<div class="container">
    <textarea bind:value={source} data-testid="markdown-input" aria-label="Markdown source"
    ></textarea>

    <div class="preview" data-testid="snippet-preview">
        <SvelteMarkdown {source}>
            {#snippet paragraph({ children })}
                <p class="custom-paragraph" data-testid="snippet-paragraph">
                    {@render children?.()}
                </p>
            {/snippet}

            {#snippet heading({ depth, children })}
                <div data-testid="snippet-heading" data-depth={depth}>
                    {#if depth === 1}<h1>{@render children?.()}</h1>
                    {:else if depth === 2}<h2>{@render children?.()}</h2>
                    {:else}<h3>{@render children?.()}</h3>{/if}
                </div>
            {/snippet}

            {#snippet link({ href, title, children })}
                <a
                    {href}
                    {title}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="snippet-link"
                >
                    {@render children?.()}
                </a>
            {/snippet}

            {#snippet code({ lang, text })}
                <pre data-testid="snippet-code" data-lang={lang}><code>{text}</code></pre>
            {/snippet}

            {#snippet blockquote({ children })}
                <blockquote data-testid="snippet-blockquote" class="custom-quote">
                    {@render children?.()}
                </blockquote>
            {/snippet}

            {#snippet list({ ordered, children })}
                {#if ordered}
                    <ol data-testid="snippet-list">{@render children?.()}</ol>
                {:else}
                    <ul data-testid="snippet-list">{@render children?.()}</ul>
                {/if}
            {/snippet}

            {#snippet listitem({ children })}
                <li data-testid="snippet-listitem">{@render children?.()}</li>
            {/snippet}

            {#snippet image({ href, title, text })}
                <img src={href} alt={text} {title} data-testid="snippet-image" />
            {/snippet}

            {#snippet html_div({ attributes, children })}
                <div {...attributes} data-testid="snippet-html-div">
                    {@render children?.()}
                </div>
            {/snippet}

            {#snippet html_a({ attributes, children })}
                <a
                    {...attributes}
                    data-testid="snippet-html-a"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    {@render children?.()}
                </a>
            {/snippet}
        </SvelteMarkdown>
    </div>
</div>
