<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const defaultMarkdown = `# Welcome to My Markdown Playground! \u{1F3A8}

Hey there! This is a *fun* example of mixing **Markdown** and <em>HTML</em> together.

## Things I Love:
1. Writing in <strong>bold</strong> and _italic_
2. Making lists (like this one!)
3. Using emojis \u{1F680} \u{2728} \u{1F308}

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
Here's a hidden surprise! \u{1F389}
</details>

Happy coding! <span style="color: hotpink">\u{2665}</span>`

    let input = $state(defaultMarkdown)
    let source = $state(defaultMarkdown)
    let debounceTimer = $state<ReturnType<typeof setTimeout> | undefined>(undefined)

    function handleInput(event: Event) {
        const target = event.target as HTMLTextAreaElement
        input = target.value

        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }

        debounceTimer = setTimeout(() => {
            source = input
        }, 500)
    }

    function reset() {
        input = defaultMarkdown
        source = defaultMarkdown
        if (debounceTimer) {
            clearTimeout(debounceTimer)
        }
    }
</script>

<div class="mx-auto w-full max-w-7xl p-4">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
        <div>
            <h2 class="text-foreground text-2xl font-bold">Markdown Playground</h2>
            <p class="text-muted-foreground mt-1 text-sm">
                Edit the markdown on the left and see the live preview on the right.
            </p>
        </div>
        <button
            onclick={reset}
            class="bg-brand-600 hover:bg-brand-700 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
            <i class="fa-solid fa-rotate-right text-xs"></i>
            Reset
        </button>
    </div>

    <!-- Split Pane -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <!-- Editor -->
        <div class="border-border bg-card flex flex-col rounded-xl border p-6 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
                <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                    Editor
                </h3>
                <span class="text-muted-foreground text-xs">
                    {input.length} characters
                </span>
            </div>
            <textarea
                value={input}
                oninput={handleInput}
                class="border-border bg-background text-foreground focus:ring-brand-500/50 min-h-[500px] w-full flex-1 resize-y rounded-lg border p-4 font-mono text-sm focus:ring-2 focus:outline-none"
                spellcheck="false"
                placeholder="Type your markdown here..."
            ></textarea>
        </div>

        <!-- Preview -->
        <div class="border-border bg-card flex flex-col rounded-xl border p-6 shadow-sm">
            <div class="mb-3">
                <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">
                    Preview
                </h3>
            </div>
            <div class="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-auto">
                <SvelteMarkdown {source} />
            </div>
        </div>
    </div>
</div>
