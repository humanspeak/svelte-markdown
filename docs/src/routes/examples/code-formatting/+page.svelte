<script lang="ts">
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import { LoaderCircle } from '@lucide/svelte'
    import type { Component } from 'svelte'
    import { onMount } from 'svelte'

    let CodeFormatting: Component | null = $state(null)

    onMount(async () => {
        const mod = await import('$lib/examples/CodeFormatting.svelte')
        CodeFormatting = mod.default
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'Code Formatting | Examples | Svelte Markdown'
        seo.description =
            'Interactive demo of marked extensions for code block formatting in @humanspeak/svelte-markdown. See walkTokens extensions and snippet overrides for enhanced code display.'
        seo.ogTitle = 'Code Formatting'
        seo.ogTagline = 'Enhanced code blocks with syntax highlighting.'
        seo.ogFeatures = ['Syntax Highlight', 'Line Numbers', 'Copy Button', 'Language Tags']
        seo.ogSlug = 'examples-code-formatting'
    }
</script>

<Example
    title="Code Formatting"
    sourceUrl="https://github.com/humanspeak/svelte-markdown/blob/main/docs/src/lib/examples/CodeFormatting.svelte"
>
    {#if CodeFormatting}
        <CodeFormatting />
    {:else}
        <div class="text-muted-foreground flex items-center justify-center gap-2 py-16 text-sm">
            <LoaderCircle class="size-4 animate-spin" />
            Loading code formatting demo…
        </div>
    {/if}
</Example>
