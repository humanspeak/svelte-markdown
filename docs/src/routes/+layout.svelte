<script lang="ts">
    import '../app.css'
    import { RootLayout } from '@humanspeak/docs-kit'
    import {
        HIGHLIGHT_CONTEXT_KEY,
        setCodeHighlighter
    } from '@humanspeak/svelte-markdown/extensions/highlight'
    import { createTanstackHighlighter } from '@humanspeak/svelte-markdown/extensions/tanstack-highlight'
    import { css } from '@tanstack/highlight/languages/css'
    import { html } from '@tanstack/highlight/languages/html'
    import { js } from '@tanstack/highlight/languages/js'
    import { json } from '@tanstack/highlight/languages/json'
    import { markdown } from '@tanstack/highlight/languages/markdown'
    import { shell } from '@tanstack/highlight/languages/shell'
    import { svelte } from '@tanstack/highlight/languages/svelte'
    import { ts } from '@tanstack/highlight/languages/ts'
    import { createThemeCss } from '@tanstack/highlight/theme'
    import githubDarkTheme from '@tanstack/highlight/themes/github-dark'
    import githubLightTheme from '@tanstack/highlight/themes/github-light'
    import { setContext } from 'svelte'
    import { docsConfig } from '$lib/docs-config'
    import githubStats from '$lib/github-stats.json'

    const { children } = $props()

    // Site-wide code highlighting for every live <SvelteMarkdown> demo that
    // uses `renderers={{ code: HighlightedCode }}`. One synchronous TanStack
    // engine (keeps streaming enabled) covering the fence languages the demo
    // sources use; aliases resolve (typescript, javascript, bash, md, ...).
    // Registered as both the module singleton and context so every
    // descendant HighlightedCode resolves it; demos that set their own
    // context (engine comparison, LLM streaming) still override it.
    const highlighter = createTanstackHighlighter({
        languages: [ts, js, json, css, html, svelte, shell, markdown]
    })
    setCodeHighlighter(highlighter)
    setContext(HIGHLIGHT_CONTEXT_KEY, highlighter)

    const tanstackThemeCss = createThemeCss({
        light: githubLightTheme,
        dark: githubDarkTheme,
        darkSelector: 'html.dark'
    })
</script>

<svelte:head>
    <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
    {@html `<style>${tanstackThemeCss}</style>`}
</svelte:head>

<RootLayout config={docsConfig} favicon="/favicon.png" stars={githubStats.stars}>
    {@render children?.()}
</RootLayout>
