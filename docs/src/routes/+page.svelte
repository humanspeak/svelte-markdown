<script lang="ts">
    import { localStore } from '$lib/state/localStore.svelte'
    import { Textarea } from '$lib/shadcn/components/ui/textarea/index.js'
    import SvelteMarkdown, { type Token, type TokensList } from '@humanspeak/svelte-markdown'
    import * as Card from '$lib/shadcn/components/ui/card/index.js'

    const ogText = `# Welcome to My Markdown Playground! 🎨

Hey there! This is a *fun* example of mixing **Markdown** and <em>HTML</em> together.

## Things I Love:
1. Writing in <strong>bold</strong> and _italic_
2. Making lists (like this one!)
3. Using emojis 🚀 ✨ 🌈

| Feature | Markdown | HTML |
|---------|:--------:|-----:|
| Bold | **text** | <strong>text</strong> |
| Italic | *text* | <em>text</em> |
| Links | [text](url) | <a href="url">text</a> |

Here's a quote for you:
> "The best of both worlds" - <cite>Someone who loves markdown & HTML</cite>

You can even use <sup>superscript</sup> and <sub>subscript</sub> text!

---

<details>
<summary>Want to see something cool?</summary>
Here's a hidden surprise! 🎉
</details>

Happy coding! <span style="color: hotpink">♥</span>`

    const text = localStore<string>('markdown', ogText)
    let source = $state(text.value)
    let timeout: number | null = null

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onChangeTextArea = (_event: Event) => {
        if (!window) return
        if (timeout) clearTimeout(timeout)
        timeout = window.setTimeout(() => {
            source = text.value
        }, 500)
    }

    const showParsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('showing parsed tokens', parsedTokens)
    }
</script>

<div class="h-full w-full">
    <div class="flex h-full justify-center p-8">
        <div class="grid h-full w-full grid-cols-[25%_auto] gap-8">
            <div class="h-full">
                <Card.Root class="flex h-full flex-col">
                    <Card.Header>
                        <Card.Title>Editor</Card.Title>
                        <Card.Description>Just edit the text 🥰</Card.Description>
                    </Card.Header>
                    <Card.Content class="flex flex-1 flex-col">
                        <Textarea
                            onkeyupcapture={onChangeTextArea}
                            bind:value={text.value}
                            id="markdown"
                            class="w-full flex-1 resize-none"
                        />
                    </Card.Content>
                </Card.Root>
            </div>
            <div class="h-auto min-h-max">
                <Card.Root class="flex h-full w-full flex-col">
                    <Card.Header>
                        <Card.Title>Markdown</Card.Title>
                        <Card.Description>Your renderded markdown 👩🏼‍💻</Card.Description>
                    </Card.Header>
                    <Card.Content class="flex-1">
                        <div
                            class="h-full w-full overflow-y-auto rounded-md border p-4"
                            id="markdown"
                        >
                            <SvelteMarkdown {source} parsed={showParsed} />
                        </div>
                    </Card.Content>
                </Card.Root>
            </div>
        </div>
    </div>
</div>
