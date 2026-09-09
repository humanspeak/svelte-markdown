# Plan 003: Demonstrate image recovery and footnote correctness in T3

> **Executor instructions:** Read this plan, follow scope, and implement only its
> demonstration pages and browser regression tests. Guard owns all .agents files,
> commits, browsers and verification. Do not invoke improve or dispatch yourself.

> Revision 2026-09-09: Preflight against footnote snapshot `57f144d` confirms
> both target routes and the browser test file are new. Use the reviewed README
> custom-renderer typing pattern: an interface extending Renderers, then
> `Partial<ExtendedRenderers>`; an inferred object containing only extension keys
> fails the root component's weak-type check. Keep all runtime files unchanged.

## Status

- **Planned at:** 57f144d, 2026-09-09.
- **Priority:** P1; **Effort:** S; **Risk:** LOW; **Category:** demonstration/test
- **Depends on:** 001, 002
- **Authorization:** Operator requested test pages in the T3 browser to inspect
  the delivered changes and how they are tested once complete.

## Why this matters

Unit tests prove edge cases but are not an interactive view of the fixes. Let
an operator trigger the real failure-to-recovery flow and inspect rendered
footnotes, preserved content and working return links while streaming.

## Existing context

- SvelteKit hosts development/test routes in src/routes/test; production package
  exports remain independent of these pages.
- src/routes/test/lazy-images/+page.svelte only renders static images; leave that
  existing route and its browser tests unchanged.
- static/test-image-150.png and test-image-50.png are existing local valid assets.
- Footnote extension and renderers are exported from $lib/extensions/index.js;
  read the current README footnote example and follow its actual types/imports.
- The streaming component supports writeChunk, resetStream, and the streaming
  prop. There is no finishStream API. Preserve accumulated source on completion.
- playwright.config.ts uses port 4173, a build/preview webServer, and five browser
  projects. Guard can reuse an already-running dev server on port 4173 locally.

## Scope allowlist

- NEW src/routes/test/image-recovery/+page.svelte
- NEW src/routes/test/footnote-correctness/+page.svelte
- NEW tests/image-footnote-correctness.test.ts

No runtime, public API, dependencies, global CSS/config, README or other existing
routes changed. Use existing local assets; no remote requests except the intentional
local missing image request. No source reimplementation or fake rendering.

## Implementation

1. Build an image recovery page using the actual SvelteMarkdown component, with
   a clear title, brief explanation of what changed, source text/current URL,
   rendered preview, and labeled controls: Load broken image, Recover with valid
   image, Switch valid image, Append prose, Reset. Start in a visible valid state.
   Controls must update the same mounted renderer and same image token position;
   do not wrap the demo in a URL-keyed block to force recovery. Appending prose
   must leave href unchanged. Explain the expected broken -> recovered behavior
   and same-URL DOM preservation; avoid hardcoded PASS indicators. If showing
   live status, derive it from actual load/error/DOM state with proper cleanup.
2. Build a footnote correctness page using the actual extension and renderers.
   Provide source + rendered preview and deterministic fixture controls for:
   repeated refs (two refs/two return links); duplicate definitions (first wins);
   a definition followed by normal paragraph and heading (both preserved);
   special labels (Unicode/punctuation and safely encoded navigation).
   Use one selected document instance to avoid misleading cross-document ID
   collisions (automatic namespaces are out of scope). Provide Stream example,
   Complete, Reset controls and visible progress. Stream can use short timed
   chunks; cancel timers on reset/unmount and avoid overlapping runs. Completion
   must preserve all accumulated text when switching streaming=false.
   Use accessible labels and enough space to click return links. Explain old
   failure and expected result in concise prose. Link both demo pages to each
   other. Source display may be read-only; a Markdown editor is not required.
3. Add meaningful Playwright tests through these controls: missing image enters
   error, recovered image naturalWidth > 0 and no error, appending prose retains
   the same DOM node; preserved paragraph+heading, unique ref IDs and real fragment
   navigation to definition then second reference; first-definition-wins; streaming
   completion retains the expected document and reset resets controls. Assert real
   DOM/output and resolve href targets instead of comparing only status labels.
   Use role/test-id selectors and waits on observed state, no arbitrary sleeps.

## Verification and environment

Companion cannot run pnpm, browsers, write .agents/.git or install dependencies.
Do not work around these limits. It can run existing direct Vitest, but these
pages are browser-tested by guard. Report unavailable checks truthfully.
Guard runs trunk fmt/check, pnpm check, pnpm build, and
`pnpm exec playwright test tests/image-footnote-correctness.test.ts --project=chromium --reporter=line`.
Guard opens both pages with T3 preview tools, snapshots before interactions,
exercises recovery and footnote navigation/streaming, and leaves a visible tab.
Full unit coverage is inherited from the reviewed unchanged Plan 002 runtime;
no need to repeat it for these route/test-only additions.

## Done criteria

- [ ] Both pages render the real library, with working documented controls and local assets.
- [ ] New Playwright browser regression tests pass in Chromium; no mocked render results.
- [ ] Trunk check, pnpm check, pnpm build and git diff --check pass.
- [ ] Guard observes recovery and footnote navigation in T3 and leaves pages accessible to the user.
- [ ] Changes match the three-file allowlist; guard records verification and status.

## STOP conditions

Stop if the demonstrations expose a library defect requiring a runtime change;
report it for a separate fix dispatch against the appropriate plan. Do not hide
it through keyed remounts, altered fixture semantics or fake status. Stop if
browser tooling remains unavailable after diagnosis; provide URLs and exact blocker.
