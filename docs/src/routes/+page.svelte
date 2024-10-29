<script lang="ts">
    import Html from '$lib/component/SvelteMarkdown/Html.svelte'
    import { Label } from '$lib/shadcn/components/ui/label'
    import Textarea from '$lib/shadcn/components/ui/textarea/textarea.svelte'
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    let text = $state('Hi! I am **Svelte-Markdown** 👋')
    let source = $state($state.snapshot(text)) // eslint-disable-line svelte/valid-compile
    let timeout: number | null = null

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const onChangeTextArea = (_event: Event) => {
        if (!window) return
        if (timeout) clearTimeout(timeout)
        timeout = window.setTimeout(() => {
            source = text
        }, 500)
    }
</script>

<div class="w-full">
    <h1 class="text-center text-4xl font-extrabold">Svelte-Markdown</h1>

    <div class="flex justify-center">
        <div class="grid w-[50%] grid-cols-2 gap-4">
            <div>
                <Label for="markdown">Markdown Text</Label>
                <Textarea onkeyupcapture={onChangeTextArea} bind:value={text} id="markdown" />
            </div>
            <div>
                <SvelteMarkdown
                    {source}
                    renderers={{
                        html: Html
                    }}
                />
            </div>
        </div>
    </div>

    <footer>
        <p class="w-full text-center">
            Made with <i class="fa-duotone fa-heart"></i> by
            <a class="humanspeak" target="_blank" href="https://humanspeak.com">Humanspeak</a>
        </p>
        <p class="w-full text-center">
            Original project by <a target="_blank" href="https://github.com/pablo-abc">
                Pablo Berganza
            </a>
        </p>
    </footer>
</div>

<style>
    .fa-heart {
        --fa-secondary-color: red;
    }
</style>
