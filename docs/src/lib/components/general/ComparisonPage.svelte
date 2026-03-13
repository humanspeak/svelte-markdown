<script lang="ts">
    import type { Competitor } from '$lib/compare-data'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import {
        ArrowRight,
        Check,
        X,
        Minus,
        Rocket,
        ExternalLink,
        ThumbsUp,
        ThumbsDown,
        Scale,
        Swords
    } from '@lucide/svelte'

    const { competitor }: { competitor: Competitor } = $props()

    const seo = getSeoContext()
    if (seo) {
        seo.title = `Svelte Markdown vs ${competitor.name} | Compare`
        seo.description = competitor.description
        seo.ogTitle = `vs ${competitor.name}`
        seo.ogTagline = competitor.tagline
        seo.ogFeatures = ['Feature Comparison', 'Pros & Cons', 'Use Case Guide', 'Honest Review']
        seo.ogSlug = `compare/${competitor.slug}`
    }

    const articleJsonLd =
        '<script type="application/ld+json">' +
        JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Article',
            headline: `Svelte Markdown vs ${competitor.name} | Compare`,
            description: competitor.description,
            author: {
                '@type': 'Organization',
                name: 'Humanspeak, Inc.',
                url: 'https://humanspeak.com'
            },
            publisher: {
                '@type': 'Organization',
                name: 'Humanspeak, Inc.',
                url: 'https://humanspeak.com'
            },
            mainEntityOfPage: {
                '@type': 'WebPage',
                '@id': `https://markdown.svelte.page/compare/${competitor.slug}`
            },
            about: [
                {
                    '@type': 'SoftwareApplication',
                    name: '@humanspeak/svelte-markdown',
                    applicationCategory: 'DeveloperApplication'
                },
                {
                    '@type': 'SoftwareApplication',
                    name: competitor.name,
                    ...(competitor.website ? { url: competitor.website } : {}),
                    applicationCategory: 'DeveloperApplication'
                }
            ],
            keywords: competitor.keywords
        }) +
        '</' +
        'script>'

    function renderCell(value: string | boolean): {
        type: 'yes' | 'no' | 'partial' | 'text'
        text: string
    } {
        if (value === true) return { type: 'yes', text: 'Yes' }
        if (value === false) return { type: 'no', text: 'No' }
        return { type: 'text', text: value }
    }
</script>

<svelte:head>
    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
    {@html articleJsonLd}
</svelte:head>

<div class="container mx-auto px-4 py-12">
    <!-- Hero Section -->
    <div class="mb-12 text-center">
        <a
            href="/compare"
            class="text-brand-600 hover:text-brand-700 mb-4 inline-flex items-center text-sm font-medium transition-colors"
        >
            <Swords class="mr-1.5 size-3.5" />
            All Comparisons
        </a>
        <h1
            class="from-brand-500 to-brand-600 mb-4 bg-gradient-to-r bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
        >
            Svelte Markdown vs {competitor.name}
        </h1>
        <p class="text-muted-foreground mx-auto max-w-2xl text-lg">
            {competitor.tagline}
        </p>
        <div class="mt-4 flex flex-wrap justify-center gap-2">
            {#if competitor.website}
                <a
                    href={competitor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="border-border text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors"
                >
                    Website
                    <ExternalLink class="ml-1 size-3" />
                </a>
            {/if}
            {#if competitor.github}
                <a
                    href={competitor.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="border-border text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors"
                >
                    GitHub
                    <ExternalLink class="ml-1 size-3" />
                </a>
            {/if}
            {#if competitor.npm}
                <a
                    href="https://www.npmjs.com/package/{competitor.npm}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="border-border text-muted-foreground hover:text-foreground inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors"
                >
                    npm: {competitor.npm}
                    <ExternalLink class="ml-1 size-3" />
                </a>
            {/if}
        </div>
    </div>

    <!-- Overview -->
    <div class="mx-auto max-w-4xl">
        <div class="border-border bg-card mb-12 rounded-xl border p-6 md:p-8">
            <h2 class="text-foreground mb-3 text-xl font-semibold">Overview</h2>
            <p class="text-muted-foreground leading-relaxed">
                {competitor.description}
            </p>
            <div class="mt-4 flex flex-wrap gap-4">
                <div class="text-muted-foreground text-sm">
                    <span class="text-foreground font-medium">Type:</span>
                    {competitor.type}
                </div>
                <div class="text-muted-foreground text-sm">
                    <span class="text-foreground font-medium">Approach:</span>
                    {competitor.approach}
                </div>
            </div>
        </div>

        <!-- Feature Comparison Table -->
        <div class="mb-12">
            <div class="mb-6 flex items-center gap-3">
                <div
                    class="from-brand-500 to-brand-600 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white"
                >
                    <Scale class="size-4" />
                </div>
                <h2 class="text-foreground text-2xl font-bold">Feature Comparison</h2>
            </div>
            <div class="border-border overflow-hidden rounded-xl border">
                <div class="overflow-x-auto">
                    <table class="w-full">
                        <thead>
                            <tr class="bg-muted/50 border-border border-b">
                                <th
                                    class="text-muted-foreground px-4 py-3 text-left text-sm font-semibold"
                                >
                                    Feature
                                </th>
                                <th
                                    class="text-brand-600 px-4 py-3 text-center text-sm font-semibold"
                                >
                                    @humanspeak/svelte-markdown
                                </th>
                                <th
                                    class="text-muted-foreground px-4 py-3 text-center text-sm font-semibold"
                                >
                                    {competitor.name}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each competitor.features as feature, i}
                                {@const usCell = renderCell(feature.us)}
                                {@const themCell = renderCell(feature.them)}
                                <tr
                                    class="border-border border-b last:border-b-0 {i % 2 === 0
                                        ? 'bg-card'
                                        : 'bg-muted/20'}"
                                >
                                    <td class="px-4 py-3">
                                        <span class="text-foreground text-sm font-medium">
                                            {feature.name}
                                        </span>
                                        {#if feature.note}
                                            <span class="text-muted-foreground block text-xs">
                                                {feature.note}
                                            </span>
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3 text-center">
                                        {#if usCell.type === 'yes'}
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                            >
                                                <Check class="size-3.5" />
                                            </span>
                                        {:else if usCell.type === 'no'}
                                            <span
                                                class="text-muted-foreground inline-flex items-center justify-center rounded-full bg-gray-100 p-1 dark:bg-gray-800"
                                            >
                                                <Minus class="size-3.5" />
                                            </span>
                                        {:else}
                                            <span class="text-foreground text-xs"
                                                >{usCell.text}</span
                                            >
                                        {/if}
                                    </td>
                                    <td class="px-4 py-3 text-center">
                                        {#if themCell.type === 'yes'}
                                            <span
                                                class="inline-flex items-center justify-center rounded-full bg-green-100 p-1 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                                            >
                                                <Check class="size-3.5" />
                                            </span>
                                        {:else if themCell.type === 'no'}
                                            <span
                                                class="text-muted-foreground inline-flex items-center justify-center rounded-full bg-gray-100 p-1 dark:bg-gray-800"
                                            >
                                                <Minus class="size-3.5" />
                                            </span>
                                        {:else}
                                            <span class="text-foreground text-xs"
                                                >{themCell.text}</span
                                            >
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <!-- Pros & Cons -->
        <div class="mb-12 grid gap-6 md:grid-cols-2">
            <!-- Our Pros -->
            <div class="border-border bg-card overflow-hidden rounded-xl border">
                <div
                    class="flex items-center gap-2 border-b border-green-200 bg-green-50 px-5 py-3 dark:border-green-900/30 dark:bg-green-900/20"
                >
                    <ThumbsUp class="size-4 text-green-600 dark:text-green-400" />
                    <h3 class="text-sm font-semibold text-green-700 dark:text-green-400">
                        Svelte Markdown Strengths
                    </h3>
                </div>
                <ul class="divide-border divide-y p-0">
                    {#each competitor.prosUs as pro}
                        <li class="flex items-start gap-2 px-5 py-2.5">
                            <Check
                                class="mt-0.5 size-3.5 shrink-0 text-green-500 dark:text-green-400"
                            />
                            <span class="text-foreground text-sm">{pro}</span>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Their Pros -->
            <div class="border-border bg-card overflow-hidden rounded-xl border">
                <div
                    class="flex items-center gap-2 border-b border-green-200 bg-green-50 px-5 py-3 dark:border-green-900/30 dark:bg-green-900/20"
                >
                    <ThumbsUp class="size-4 text-green-600 dark:text-green-400" />
                    <h3 class="text-sm font-semibold text-green-700 dark:text-green-400">
                        {competitor.name} Strengths
                    </h3>
                </div>
                <ul class="divide-border divide-y p-0">
                    {#each competitor.prosThem as pro}
                        <li class="flex items-start gap-2 px-5 py-2.5">
                            <Check
                                class="mt-0.5 size-3.5 shrink-0 text-green-500 dark:text-green-400"
                            />
                            <span class="text-foreground text-sm">{pro}</span>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Our Cons -->
            <div class="border-border bg-card overflow-hidden rounded-xl border">
                <div
                    class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/30 dark:bg-amber-900/20"
                >
                    <ThumbsDown class="size-4 text-amber-600 dark:text-amber-400" />
                    <h3 class="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        Svelte Markdown Limitations
                    </h3>
                </div>
                <ul class="divide-border divide-y p-0">
                    {#each competitor.consUs as con}
                        <li class="flex items-start gap-2 px-5 py-2.5">
                            <X
                                class="mt-0.5 size-3.5 shrink-0 text-amber-500 dark:text-amber-400"
                            />
                            <span class="text-foreground text-sm">{con}</span>
                        </li>
                    {/each}
                </ul>
            </div>

            <!-- Their Cons -->
            <div class="border-border bg-card overflow-hidden rounded-xl border">
                <div
                    class="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-5 py-3 dark:border-amber-900/30 dark:bg-amber-900/20"
                >
                    <ThumbsDown class="size-4 text-amber-600 dark:text-amber-400" />
                    <h3 class="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        {competitor.name} Limitations
                    </h3>
                </div>
                <ul class="divide-border divide-y p-0">
                    {#each competitor.consThem as con}
                        <li class="flex items-start gap-2 px-5 py-2.5">
                            <X
                                class="mt-0.5 size-3.5 shrink-0 text-amber-500 dark:text-amber-400"
                            />
                            <span class="text-foreground text-sm">{con}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        </div>

        <!-- Verdict -->
        <div class="mb-12">
            <div
                class="border-brand-500/20 from-brand-500/5 to-brand-600/5 rounded-xl border bg-gradient-to-r p-6 md:p-8"
            >
                <h2 class="text-foreground mb-3 text-xl font-bold">The Verdict</h2>
                <p class="text-muted-foreground leading-relaxed">
                    {competitor.verdict}
                </p>
            </div>
        </div>

        <!-- CTA -->
        <div class="text-center">
            <div
                class="border-brand-500/20 from-brand-500/10 to-brand-600/10 mx-auto max-w-xl rounded-2xl border bg-gradient-to-r p-8"
            >
                <h2 class="text-foreground mb-3 text-xl font-semibold">
                    Try @humanspeak/svelte-markdown
                </h2>
                <p class="text-muted-foreground mb-6">
                    Install in seconds and render your first markdown.
                </p>
                <div class="flex flex-wrap justify-center gap-3">
                    <a
                        href="/docs/getting-started"
                        class="from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 inline-flex items-center rounded-lg bg-gradient-to-r px-5 py-2.5 font-medium text-white transition-all duration-200"
                    >
                        Get Started
                        <Rocket class="ml-2 size-4" />
                    </a>
                    <a
                        href="/compare"
                        class="border-border bg-card text-foreground hover:border-brand-500/50 hover:text-brand-700 inline-flex items-center rounded-lg border px-5 py-2.5 font-medium transition-colors"
                    >
                        More Comparisons
                        <ArrowRight class="ml-2 size-4" />
                    </a>
                </div>
            </div>
        </div>
    </div>
</div>
