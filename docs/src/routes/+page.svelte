<script lang="ts">
    import { localStore } from '$lib/state/localStore.svelte'
    import { Textarea } from '$lib/shadcn/components/ui/textarea/index.js'
    import SvelteMarkdown, { type Token, type TokensList } from '@humanspeak/svelte-markdown'
    import * as Card from '$lib/shadcn/components/ui/card/index.js'
    import MainContainer from '$lib/components/MainContainer.svelte'
    import { page } from '$app/state'

    let urlText = page.url.searchParams.get('markdown')
    if (urlText) {
        try {
            urlText = decodeURIComponent(urlText)
        } catch {
            urlText = null
        }
    }

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

    const text = localStore<string>('markdown', ogText, urlText)
    let source = $state(text.value)
    let timeout: number | null = null

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

<MainContainer>
    <div class="flex h-full min-h-0 w-full">
        <div class="flex h-full min-h-0 w-full justify-center p-4">
            <div class="grid h-full min-h-0 w-full grid-cols-[25%_auto] gap-8">
                <div class="h-full min-h-0">
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
                <div class="h-auto min-h-0">
                    <Card.Root class="flex h-full w-full flex-col">
                        <Card.Header>
                            <Card.Title>Markdown</Card.Title>
                            <Card.Description>Your renderded markdown 👩🏼‍💻</Card.Description>
                        </Card.Header>
                        <Card.Content class="flex min-h-0 flex-1 flex-col">
                            <div
                                class="h-full min-h-0 w-full flex-1 overflow-y-auto rounded-md border p-4"
                            >
                                <SvelteMarkdown {source} parsed={showParsed} />
                            </div>
                        </Card.Content>
                    </Card.Root>
                </div>
            </div>
        </div>
    </div>
</MainContainer>
