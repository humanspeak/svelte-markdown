## Upgrading from 1.x to 2.0

Version 2.0 rebuilds the streaming engine; component props and the `writeChunk()` / `resetStream()` API are unchanged. Two behavior changes to check: (1) renderers for tokens inside list items and table cells no longer receive the parent list/table's `raw`, `text`, `items`, `header`, or `rows` through props; (2) the default `code` renderer emits one text node per line, so `code.firstChild` is the first line only (`textContent` is unchanged). Streaming output now matches a one-shot parse at every frame (loose lists stream as one list; reference definitions update citing links as their URL streams). `IncrementalParser.update(source, appendsTo?)` and the result fields `reuseMode` and `reusedPrefixCount` are new and additive.

- Upgrade guide: <https://markdown.svelte.page/docs/migration/v2>
- Streaming guide and measured performance: <https://markdown.svelte.page/docs/advanced/llm-streaming>
- Headless parser API: <https://markdown.svelte.page/docs/advanced/headless-parser>
- Release notes: <https://github.com/humanspeak/svelte-markdown/releases>

## Links

- Homepage: <https://markdown.svelte.page>
- Repository: <https://github.com/humanspeak/svelte-markdown>
- NPM: <https://www.npmjs.com/package/@humanspeak/svelte-markdown>
- Issues: <https://github.com/humanspeak/svelte-markdown/issues>
- Background reading: [Using Claude Code: The Unreasonable Effectiveness of HTML](https://x.com/trq212/status/2052809885763747935) by Thariq
