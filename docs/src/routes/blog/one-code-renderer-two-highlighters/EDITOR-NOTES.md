# Editor notes: "One Code Renderer, Two Highlighters"

Not routed (SvelteKit only serves `+page.svx`). Delete this file before or after publishing.

## Thesis in one line

The Shiki integration was never about Shiki; it was about keeping async off the render path. Writing that constraint down as a two-method interface made the engine swappable.

## Facts the post relies on (verified 2026-09-27 in this branch)

| Claim in post                                                                     | Source                                                                     |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Shiki core + JS engine + `ts`/`js`/`json` + one theme is ~87 KB gzip (534 KB min) | esbuild `--bundle --minify`, gzip -9, `shiki@4.4.x`                        |
| TanStack core + `ts`/`js`/`json` is ~4 KB gzip (10 KB min)                        | same method, `@tanstack/highlight@0.1.0`                                   |
| TanStack ships 25 languages                                                       | `node_modules/@tanstack/highlight/dist/languages/`                         |
| TanStack is at 0.1.0 and says the contract can move                               | npm `dist-tags.latest`, TanStack launch post                               |
| Shiki JS engine ~1–2 ms per line                                                  | existing figure from the Shiki docs page (measured at the original spike)  |
| `highlight-fallback` replaces `shiki-fallback` only in the unconfigured state     | `src/lib/extensions/highlight/HighlightedCode.svelte`, `ShikiCode.test.ts` |
| Adversarial `lang` strings covered on every path                                  | `createTanstackHighlighter.test.ts`, `createShikiHighlighter.test.ts`      |

The demo timing numbers are intentionally not quoted in the post; they vary by machine. Readers get them live from the demo.

## Things to double-check before publishing

- **Publish date and version.** The post is dated 2026-09-27. Update to the actual release date and mention the package version in the first paragraph if the release note convention wants it.
- **TanStack Highlight version.** If they ship 0.2 before this goes out, re-run the size measurement and update both the post and `docs/advanced/syntax-highlighting`. The measurement is two esbuild commands; see the PR description.
- **Demo link** `/examples/highlight-engines` must be live and the nav entry visible. The page is in this PR.
- **The "earlier this year" opener** assumes the Shiki spike shipped in 2026. Confirm against the changelog.
- **Reading time** is set to 7 minutes. Recalculate after edits.
- **Tags.** `tanstack` is a new tag on this blog. Fine, but make sure the tag index renders it.

## Tone notes

- Same register as "Rendering Agent HTML Safely": first person plural, short declarative sentences, one anecdote, no marketing adjectives.
- The post deliberately does not declare a winner. Keep it that way. The comparison page (`/compare`) is where we make claims against competitors; this post is about our own design choice.
- "Neither, and both" in the intro is the hook. Don't cut it.
- The security paragraph is short on purpose. The XSS blog post already covers the model; this post just needs to show highlighting didn't reopen a hole.

## Possible cuts if it runs long

1. The "What we'd do differently" section can be dropped to a single sentence in "Which one should you use". It's honest but not essential.
2. The third `highlight`/`hasLang` code block is the same interface shown in the docs; could be replaced by a link.

## Possible additions if it runs short

- A two-frame screenshot of the demo with both `calls` counters frozen. Shows the memoization point better than prose.
- A short paragraph on why TanStack's semantic-class output also produces less DOM per chunk (their launch post measured ~3.4× less HTML than Shiki), which matters for the streaming p95 numbers we publish on the compare page.

## Social blurb (draft)

> We pulled the highlighter out of our code renderer. `HighlightedCode` now takes any two-method `CodeHighlighter`, and we ship two: Shiki (87 KB, editor-exact) and TanStack Highlight (4 KB, CSS themes). Both streaming-safe. Side-by-side demo with live timings: [link]

## Cross-links to add on publish

- From `docs/advanced/syntax-highlighting` "Related" list.
- From the `vs-svelte-streamdown` compare page, under the syntax-highlighting row, if we update the feature matrix.
- From the README "Syntax Highlighting" section (currently links to the demo; add the post).
