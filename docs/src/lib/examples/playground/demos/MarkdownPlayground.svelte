<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { DemoSplitV2 } from '@humanspeak/docs-kit'

    const defaultMarkdown = `## Welcome to My Markdown Playground! 🎨

Hey there! This is a *fun* example of mixing **Markdown** and <em>HTML</em> together.

### Things I Love:
1. Writing in <strong>bold</strong> and _italic_
2. Making lists (like this one!)
3. Using emojis 🚀 ✨ 🌈

| Feature | Markdown | HTML |
|---------|:--------:|-----:|
| Bold | **text** | <strong>text</strong> |
| Italic | *text* | <em>text</em> |
| Links | [npm](https://www.npmjs.com/package/@humanspeak/svelte-markdown) | <a href="https://github.com/humanspeak/svelte-markdown">github</a> |

Here's a quote for you:
> "The best of both worlds" - <cite>Someone who loves markdown & HTML</cite>

You can even use <sup>superscript</sup> and <sub>subscript</sub> text!

---

<details>
<summary>Want to see something cool?</summary>
Here's a hidden surprise! 🎉
</details>

Happy coding! <span style="color: hotpink">♥</span>`

    // `input` tracks the textarea verbatim; `source` is what
    // `SvelteMarkdown` actually renders. The 500ms debounce avoids
    // re-parsing on every keystroke during fast typing.
    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
            source = input
        }, 500)
    }
</script>

<DemoSplitV2 leftLabel="EDITOR" leftTone="markdown" rightLabel="PREVIEW" rightTone="rendered">
    {#snippet left()}
        <textarea
            value={input}
            oninput={handleInput}
            class="dk-pg-editor"
            spellcheck="false"
            placeholder="Type your markdown here..."></textarea>
    {/snippet}
    {#snippet right()}
        <div class="dk-pg-preview prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown {source} />
        </div>
    {/snippet}
</DemoSplitV2>

<style>
    /* Textarea sits on the brut surface — no card border, no rounded
       corners. The DemoSplit's vertical hairline and pane padding draws
       the divider; the textarea just owns its own typography. */
    .dk-pg-editor {
        width: 100%;
        height: 100%;
        min-height: 360px;
        resize: none;
        border: 0;
        outline: none;
        background: transparent;
        color: var(--brut-ink, var(--foreground, inherit));
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12.5px;
        line-height: 1.7;
        padding: 0;
    }
    .dk-pg-preview {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink-2, var(--muted-foreground, inherit));
    }
    .dk-pg-preview :global(h1),
    .dk-pg-preview :global(h2),
    .dk-pg-preview :global(h3) {
        font-family: 'Inter Variable', 'Inter', system-ui, sans-serif;
        color: var(--brut-ink, var(--foreground, inherit));
        letter-spacing: -0.02em;
    }
    .dk-pg-preview :global(code) {
        background: var(--brut-bg-2, var(--muted, rgba(127, 127, 127, 0.08)));
        border: 1px solid var(--brut-rule, rgba(127, 127, 127, 0.18));
        padding: 0 4px;
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 12px;
    }
    .dk-pg-preview :global(blockquote) {
        border-left: 2px solid var(--brut-accent, var(--color-brand-500, #54dbbc));
        padding-left: 12px;
        font-style: italic;
        color: var(--brut-ink-2);
    }
    .dk-pg-preview :global(table) {
        border-collapse: collapse;
        font-size: 12.5px;
        width: 100%;
        margin: 8px 0;
    }
    .dk-pg-preview :global(th),
    .dk-pg-preview :global(td) {
        border: 1px solid var(--brut-rule);
        padding: 6px 10px;
        text-align: left;
    }
    .dk-pg-preview :global(th) {
        background: var(--brut-bg-2);
        font-family: 'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.12em;
        color: var(--brut-ink-3);
        text-transform: uppercase;
        font-weight: 400;
    }
    .dk-pg-preview :global(a) {
        color: var(--brut-accent);
        text-decoration: underline;
        text-decoration-color: var(--brut-rule);
    }
</style>
