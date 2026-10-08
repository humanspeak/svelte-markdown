# Opus 5.5 execution report — plan 001

Verbatim executor report; guard verdict is recorded separately.

```text
# Plan 001 execution report (preparsed SSR)

Plan 001 is done and every gate passed when I ran it. Token arrays passed as `source` now render on the server even when an async extension is set through document context. The SSR test failed on the unchanged code and passes after the fix. Nothing is committed.

## Pre-flight
- **Checkout:** `/Users/jasonkummerl/Github/svelte-markdown` on `investigate/issue-372-md-preprocessor`, HEAD `5b36e6a`, working tree clean.
- **Drift check:** `git diff --stat e6195d0..HEAD -- <the six scoped paths>` printed nothing and exited 0. The live code matched the plan excerpts.
- **Port 4173:** nothing was listening, so Playwright built and served its own preview. I didn't touch the preview on 8237.

## Files changed (all in scope)
- `src/routes/test/preprocess/async-tokens/+page.ts` (new): `export const prerender = true`.
- `src/routes/test/preprocess/async-tokens/+page.svelte` (new):
  - sets document context with `extensions: [{ async: true, walkTokens() { return Promise.resolve() } }]`;
  - renders `MarkdownDocument` with one paragraph token, `Prepared async context`, inside `data-testid="async-tokens-document"`.
- `tests/preprocess-async-tokens.test.ts` (new): three tests.
  - `request.get` checks that the HTTP body has a rendered `<p>…Prepared async context…</p>` inside the test div.
  - A context with JavaScript disabled checks the paragraph is visible.
  - A normal page load checks the paragraph is still there after hydration.
- `src/lib/SvelteMarkdown.svelte`:
  - `rawTokens` now returns `source` directly when it is an array, before choosing between streaming, async and sync.
  - `syncTokens` returns `undefined` for arrays, which are now handled by `rawTokens`.
  - Async string parsing, the async `$effect` and the streaming effects are unchanged.
- `src/lib/SvelteMarkdown.test.ts`: the old array+async test is replaced by "async path renders pre-parsed token arrays without parsing". It covers:
  - an initial array, a replacement array and an empty array, each checked right after render;
  - zero calls to `lexAndClean`, `parseAndCacheTokens`, `parseAndCacheTokensAsync` and the extension's `walkTokens`;
  - a control: switching to a string source does call the async parser and `walkTokens`.
- `README.md`: a short note in the experimental hybrid preprocessor section. Supplied arrays render synchronously, including in SSR, even with async extensions, and extensions don't reparse or transform them. Async string sources still parse after mount and are not server-rendered.

## Red first (unchanged component, new route and test)
`pnpm exec playwright test tests/preprocess-async-tokens.test.ts --project=chromium` → **2 failed, 1 passed**.
- **Prerendered HTML test:** the regex didn't match. The prerendered file `.svelte-kit/output/prerendered/pages/test/preprocess/async-tokens.html` has an empty document div (`<div data-testid="async-tokens-document"><!--[0--><!--[-1--><!--]-->…</div>`). It contains the text 0 times.
- **No-JavaScript test:** "element(s) not found" for the `<p>`.
- **Hydrated test:** passed, because the client `$effect` fills the content in after load. This confirms the bug is SSR-only.
- The build succeeded, so this was the real blank-paragraph failure, not an import or compile error.

## Green (exact commands, final tree)
- `pnpm exec playwright test tests/preprocess-async-tokens.test.ts --project=chromium` → 3 passed. Run after the fix and again after `trunk fmt` and the README edit.
- `pnpm test:only src/lib/SvelteMarkdown.test.ts` → 82 passed, including the existing async-string and streaming tests.
- `pnpm test:only src/lib/preprocess/` → 4 files, 31 tests passed.
- `pnpm test` → 168 files, 1441 tests passed, exit 0. Coverage was 97.48% statements, 92.9% branches, 98.28% functions and 98.71% lines, all above the gates.
- `trunk fmt` → No issues, exit 0. `trunk check` → exit 0.
- `pnpm check` → 0 errors and the 3 known baseline warnings (`_UnsupportedHTML`, `Parser`, `issue-195/CustomList`).
- `pnpm build` → exit 0, publint "All good!". The only warning is Vite's chunk-size notice.
- `git diff --check` → exit 0. The new untracked files aren't covered by that command, so I grepped them separately and found no trailing whitespace.

## Assumptions and deviations
- **Unit test isn't a red test:** the strengthened test also passes on the original component, which I checked by temporarily restoring the HEAD version and then putting the fix back. In jsdom, `render` runs effects synchronously, so it can't see the SSR gap. The Playwright route is the red-to-green regression, as the plan intends. The unit test covers the zero-parsing, zero-`walkTokens`, replacement and empty-array behaviour.
- **Streaming with an array source:** this also goes through the new array-first branch, so it renders `source` itself instead of the `[...source]` copy the streaming effect makes. I left the streaming state and effects alone; they still run and set `streamTokens` the same way. For arrays, the streaming metadata start offsets are already reset to 0, so the render metadata is the same. The full suite, streaming tests included, passed.
- **Unused array branch:** the async `$effect` still assigns arrays to `asyncTokens`. That's no longer read for arrays but does no parsing; I kept it so async string behaviour stays exactly as it was.
- **README placement:** the README has no separate section on supplying your own tokens, so the note went in the experimental hybrid preprocessor section, which is where that usage lives. The props table row is unchanged.

## Blocked verification
None. No dependency or lockfile changes, no Playwright browser install was needed, and no STOP condition fired.
```
