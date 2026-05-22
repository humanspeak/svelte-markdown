## Overview

- Package: `@humanspeak/svelte-markdown`
- License: MIT
- Requires: Svelte 5
- Maintained by: [Humanspeak, Inc.](https://humanspeak.com)
- Current version: see https://www.npmjs.com/package/@humanspeak/svelte-markdown

## Installation

```bash
npm install @humanspeak/svelte-markdown
```

## Basic Usage

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    const source = '# Hello\n\nThis is **bold** and *italic*. Mixed <em>HTML</em> works too.'
</script>

<SvelteMarkdown {source} />
```

## Streaming AI Agent Output

The library is purpose-built to render LLM streaming output that mixes markdown and HTML — partial nested HTML structures reconcile correctly as `</tag>` arrives mid-stream.

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import type { StreamingChunk } from '@humanspeak/svelte-markdown'

    let markdown:
        | { writeChunk: (chunk: StreamingChunk) => void; resetStream: (next?: string) => void }
        | undefined

    async function streamFromAgent(response: Response) {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        markdown?.resetStream('')
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            markdown?.writeChunk(decoder.decode(value, { stream: true }))
        }
    }
</script>

<SvelteMarkdown bind:this={markdown} source="" streaming={true} />
```

The streaming API supports both append-mode (string chunks) and websocket-style offset chunks (`writeChunk({ value, offset })`). Sanitization runs per token as chunks arrive — a `javascript:` URL or `on*=` handler emitted mid-stream is blocked before it reaches the DOM.

## XSS-Safe Defaults

Built-in sanitization runs in the Parser before tokens reach any renderer or snippet. Applied automatically with no opt-in:

- **URL protocol allowlist** — `href`, `src`, `action`, `formaction`, `cite`, `data`, `poster` restricted to `http:`, `https:`, `mailto:`, `tel:`, and relative URLs. `javascript:`, `vbscript:`, `data:`, and `blob:` are blocked (including mixed-case and leading-whitespace variants).
- **Event handler stripping** — every `on*` attribute (`onclick`, `onerror`, `onload`, etc.) removed.
- **`srcdoc` stripping** — prevents iframe HTML injection.
- **No `<script>` or `<style>` renderers** — both tags fall through to `UnsupportedHTML` (visible escaped text, not executed).

```svelte
<script lang="ts">
    import SvelteMarkdown, { defaultSanitizeUrl } from '@humanspeak/svelte-markdown'

    const markdown =
        '![diagram](data:image/png;base64,iVBORw0KGgo...) and [external](javascript:alert(1))'

    // Custom policy: allow data: URIs only on images
    function customSanitizeUrl(url, { type, tag }) {
        if (tag === 'img' && url.startsWith('data:image/')) return url
        return defaultSanitizeUrl(url, { type, tag })
    }
</script>

<SvelteMarkdown source={markdown} sanitizeUrl={customSanitizeUrl} />
```

## Custom HTML Tag Routing

Route semantic markup like `<thinking>`, `<tool-call>`, or any custom element to your own Svelte components:

```svelte
<script lang="ts">
    import SvelteMarkdown, { Html } from '@humanspeak/svelte-markdown'
    import Thinking from './Thinking.svelte'
    import ToolCall from './ToolCall.svelte'

    const agentResponse =
        '<thinking>weighing options</thinking>\n\nHere is my plan:\n\n<tool-call name="search" />'

    const renderers = {
        html: { ...Html, thinking: Thinking, 'tool-call': ToolCall }
    }
</script>

<SvelteMarkdown source={agentResponse} {renderers} />
```

## Key Features

- AI agent / LLM output rendering — stream mixed markdown and HTML from Claude Code, ChatGPT, Gemini, and agentic workflows
- LLM streaming mode with smart token diffing (median ~3ms per chunk on typical streams, well under the 60fps budget)
- Streaming-aware sanitization — partial HTML blocks reconcile correctly as the closing tag arrives
- XSS-safe defaults — URL protocol allowlist, `on*` and `srcdoc` stripping
- Custom sanitizer hooks — `sanitizeUrl` / `sanitizeAttributes` props with `defaultSanitize*` and `unsanitized*` exports
- 24 built-in markdown renderers (heading, paragraph, link, code, table, etc.)
- 83 HTML tag renderers for raw HTML within markdown
- Custom HTML tag routing — render `<thinking>`, `<tool-call>`, or any tag as your own component
- Svelte 5 runes compatibility ($props, $derived) with full TypeScript types
- LRU token caching (50-200x faster re-renders)
- Allow/deny filtering for HTML tags and markdown renderers (`allowHtmlOnly`, `excludeHtmlOnly`, `buildUnsupportedHTML`, `allowRenderersOnly`, `excludeRenderersOnly`, `buildUnsupportedRenderers`)
- Custom renderer components and Svelte 5 snippet overrides for inline customization
- First-party marked extensions module — `@humanspeak/svelte-markdown/extensions` exports `markedKatex` + `KatexRenderer`, `markedMermaid` + `MermaidRenderer`, `markedAlert` + `AlertRenderer`, and `markedFootnote` + `FootnoteRef` + `FootnoteSection`
- Code formatting via the `marked-code-format` walkTokens extension — add `prettier` to any code fence and it's auto-formatted through Prettier with zero custom renderer
- Async markdown parsing support
- Secure HTML parsing via HTMLParser2 (no `innerHTML`)
- Standalone `IncrementalParser` export for headless / non-Svelte / server-side consumers (same engine as `streaming={true}`)

## Use Cases

- Streaming chat / assistant UIs (Anthropic SDK, OpenAI SDK, custom SSE)
- Rich AI artifact rendering (design mockups, PR explainers, dashboards) emitted by agents as HTML
- Throwaway editors with copy-back exports — agent emits an HTML editor for one piece of data, user pastes the result back into the next prompt
- Status reports / synthesized explainers — agents emit semi-structured HTML reports with embedded diagrams and tables
- Mixed markdown + custom semantic tags (`<thinking>`, `<citation>`, `<artifact>`)
