<script lang="ts">
    import { localStore } from '$lib/state/localStore.svelte'
    import Html from '$lib/components/SvelteMarkdown/Html.svelte'
    import Textarea from '$lib/shadcn/components/ui/textarea/textarea.svelte'
    import SvelteMarkdown, { type Token, type TokensList } from '@humanspeak/svelte-markdown'
    import * as Card from '$lib/shadcn/components/ui/card/index.js'

    const ogText = `Hi! I am **Svelte-Markdown**<sup>TM</sup> 👋`

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
            <div class="h-auto min-h-max">
                <Card.Root class="h-auto min-h-[100%]">
                    <Card.Header>
                        <Card.Title>Editor</Card.Title>
                        <Card.Description>Just some text to format 🥰</Card.Description>
                    </Card.Header>
                    <Card.Content>
                        <Textarea
                            onkeyupcapture={onChangeTextArea}
                            bind:value={text.value}
                            id="markdown"
                            class="h-fit"
                        />
                        <p class="text-muted text-sm">*Note: Type markdown here</p>
                    </Card.Content>
                </Card.Root>
            </div>
            <div class="h-auto min-h-max">
                <Card.Root class="h-auto min-h-[100%]">
                    <Card.Header>
                        <Card.Title>Markdown</Card.Title>
                        <Card.Description>Your renderded markdown 👩🏼‍💻</Card.Description>
                    </Card.Header>
                    <Card.Content class="block h-auto min-h-[100%]">
                        <div
                            class="h-auto min-h-[100%] w-full overflow-y-scroll rounded-md border p-4"
                            id="markdown"
                        >
                            <SvelteMarkdown
                                {source}
                                parsed={showParsed}
                                renderers={{
                                    html: Html
                                }}
                            />
                        </div>
                    </Card.Content>
                </Card.Root>
            </div>
        </div>
    </div>
</div>
