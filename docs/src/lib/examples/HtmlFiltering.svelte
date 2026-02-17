<script lang="ts">
    import SvelteMarkdown, {
        allowHtmlOnly,
        buildUnsupportedHTML
    } from '@humanspeak/svelte-markdown'

    const sampleMarkdown = `# HTML Filtering Demo

This paragraph has **bold** and *italic* markdown formatting.

<div style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
This is inside a div element.
</div>

<strong>HTML strong tag</strong> and <em>HTML em tag</em>.

<details>
<summary>Click to expand</summary>
Hidden content inside details/summary tags.
</details>

<iframe src="https://example.com"></iframe>

${`<${'script'}>alert('blocked')</${'script'}>`}`

    type FilterMode = 'allow-all' | 'allow-safe' | 'block-all'

    let mode: FilterMode = $state('allow-all')

    const htmlRenderers = $derived.by(() => {
        switch (mode) {
            case 'allow-safe':
                return allowHtmlOnly([
                    'strong',
                    'em',
                    'div',
                    'span',
                    'details',
                    'summary',
                    'sup',
                    'sub',
                    'cite',
                    'a'
                ])
            case 'block-all':
                return buildUnsupportedHTML()
            default:
                return undefined
        }
    })

    const renderers = $derived(htmlRenderers ? { html: htmlRenderers } : {})

    const modeInfo: Record<FilterMode, { label: string; icon: string; description: string }> = {
        'allow-all': {
            label: 'Allow All HTML',
            icon: 'fa-solid fa-shield-halved',
            description:
                'All HTML tags are rendered as-is. This includes potentially dangerous tags like <script> and <iframe>.'
        },
        'allow-safe': {
            label: 'Allow Only Safe',
            icon: 'fa-solid fa-shield-check',
            description:
                'Only safe HTML tags are allowed: strong, em, div, span, details, summary, sup, sub, cite, and a. Dangerous tags like <script> and <iframe> are blocked.'
        },
        'block-all': {
            label: 'Block All HTML',
            icon: 'fa-solid fa-shield',
            description:
                'All HTML tags are blocked. Only standard markdown formatting is rendered. Raw HTML is stripped from the output.'
        }
    }

    const modes: FilterMode[] = ['allow-all', 'allow-safe', 'block-all']
</script>

<div class="mx-auto w-full max-w-4xl p-4">
    <!-- Header -->
    <div class="mb-6">
        <h2 class="text-foreground text-2xl font-bold">HTML Filtering</h2>
        <p class="text-muted-foreground mt-1 text-sm">
            Control which HTML tags are allowed in your markdown content using
            <code class="bg-muted rounded px-1.5 py-0.5 text-xs">allowHtmlOnly</code>
            and
            <code class="bg-muted rounded px-1.5 py-0.5 text-xs">buildUnsupportedHTML</code>.
        </p>
    </div>

    <!-- Mode Buttons -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
        {#each modes as m (m)}
            <button
                onclick={() => (mode = m)}
                class="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors {mode ===
                m
                    ? 'bg-brand-600 text-white'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground border'}"
            >
                <i class="{modeInfo[m].icon} text-xs"></i>
                {modeInfo[m].label}
            </button>
        {/each}
    </div>

    <!-- Current Mode Info -->
    <div class="border-border bg-card mb-6 rounded-xl border p-4 shadow-sm">
        <div class="flex items-start gap-3">
            <div
                class="bg-brand-500/10 text-brand-600 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
            >
                <i class={modeInfo[mode].icon}></i>
            </div>
            <div>
                <p class="text-foreground text-sm font-medium">{modeInfo[mode].label}</p>
                <p class="text-muted-foreground mt-0.5 text-xs">
                    {modeInfo[mode].description}
                </p>
            </div>
        </div>
    </div>

    <!-- Rendered Content -->
    <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
        <div class="mb-4 flex items-center gap-2">
            <h3 class="text-foreground text-sm font-semibold tracking-wide uppercase">Output</h3>
            <span
                class="rounded-full px-2 py-0.5 text-xs font-medium {mode === 'allow-all'
                    ? 'bg-red-500/10 text-red-600'
                    : mode === 'allow-safe'
                      ? 'bg-amber-500/10 text-amber-600'
                      : 'bg-green-500/10 text-green-600'}"
            >
                {mode === 'allow-all'
                    ? 'Unrestricted'
                    : mode === 'allow-safe'
                      ? 'Safe Only'
                      : 'HTML Blocked'}
            </span>
        </div>
        <div class="prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown source={sampleMarkdown} {renderers} />
        </div>
    </div>

    <!-- Code Reference -->
    <div class="border-border bg-card mt-6 rounded-xl border p-6 shadow-sm">
        <h3 class="text-foreground mb-3 text-sm font-semibold tracking-wide uppercase">
            Code Reference
        </h3>
        <div class="space-y-3">
            {#each modes as m (m)}
                <div
                    class="rounded-lg p-3 {mode === m
                        ? 'bg-brand-500/10 border-brand-500/30 border'
                        : 'bg-muted'}"
                >
                    <p class="text-foreground mb-1 text-xs font-semibold">{modeInfo[m].label}</p>
                    <pre
                        class="text-muted-foreground overflow-x-auto text-xs leading-relaxed">{#if m === 'allow-all'}<!-- No html renderers override needed -->
&lt;SvelteMarkdown source=&#123;markdown&#125; /&gt;{:else if m === 'allow-safe'}import &#123; allowHtmlOnly &#125; from '@humanspeak/svelte-markdown'

const html = allowHtmlOnly(['strong', 'em', 'div', 'span',
    'details', 'summary', 'sup', 'sub', 'cite', 'a'])

&lt;SvelteMarkdown source=&#123;markdown&#125; renderers=&#123;&#123; html &#125;&#125; /&gt;{:else}import &#123; buildUnsupportedHTML &#125; from '@humanspeak/svelte-markdown'

const html = buildUnsupportedHTML()

&lt;SvelteMarkdown source=&#123;markdown&#125; renderers=&#123;&#123; html &#125;&#125; /&gt;{/if}</pre>
                </div>
            {/each}
        </div>
    </div>
</div>
