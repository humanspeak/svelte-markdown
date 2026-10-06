# Plan 001: Render token arrays on the server with async extensions

> **Executor instructions:** Read this entire plan; follow steps in order and
> run each verification. Honor STOP conditions. The conductor maintains index.
>
> **Drift check (first):** `git diff --stat e6195d0..HEAD -- src/lib/SvelteMarkdown.svelte src/lib/SvelteMarkdown.test.ts src/routes/test/preprocess/async-tokens/+page.svelte src/routes/test/preprocess/async-tokens/+page.ts tests/preprocess-async-tokens.test.ts README.md`.
> Compare the current-state excerpts if paths changed; STOP on unexplained drift.
> Also inspect `git status --short`; unrelated pre-existing edits must not be
> staged, reformatted, or included in your report as your work.

## Status

- **Priority:** P1
- **Effort:** S
- **Risk:** LOW
- **Depends on:** none
- **Category:** bug
- **Planned at:** commit `e6195d0`, 2026-10-06

## Why this matters

Preparsed arrays need no async parser work, yet any async layout extension
makes SSR blank. Select array source synchronously for SSR and initial client
render, while preserving existing async string parsing and streaming behavior.

## Current state

`src/lib/SvelteMarkdown.svelte:554` currently derives sync tokens as:

```ts
if (hasAsyncExtension) return undefined
if (streaming) return undefined
if (Array.isArray(source)) return source as Token[]
```

At :573 `asyncTokens` starts undefined. At :580 an `$effect` assigns arrays to
that state. At :611 rawTokens chooses asyncTokens whenever hasAsyncExtension.
Effects do not run in SSR. MarkdownDocument.svelte:38 forwards context extensions.
`SvelteMarkdown.test.ts:1303` covers array+async in the browser after timers,
but not server output. `tests/issues/issue-210.test.ts` is the Playwright exemplar.
`src/lib/preprocess/context.ts` exposes setMarkdownDocumentContext(config).

## Repository conventions and commands

This is @humanspeak/svelte-markdown, Svelte 5 with strict TypeScript, Marked 18,
SvelteKit/Vite, pnpm 12.6.0, Node >=22. The branch is an unpublished proof for
issue #372: build-time Markdown tokens use the existing customizable renderer,
and embedded Svelte compiles without authoring delimiters. Trusted local files
are application source; runtime CMS strings never gain executable expressions.
Do not add a bundled DOM sanitizer, remote fetching, or editor functionality.

Use Trunk, never raw ESLint/Prettier; never eslint-disable. Match existing Vitest
`describe/it/expect` tests and Playwright `test/expect` tests. Svelte components
use `$props`, `$state`, `$derived`. Regression tests must assert rendered output,
not only generated-source spelling. README updates are required for changed
public behavior; keep experimental framing. Coverage gates are 95% statements,
89% branches, 95% functions, 96% lines (vite.config.ts).

| Purpose                    | Command                                                    | Expected                                                           |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Bootstrap if necessary     | `pnpm install --frozen-lockfile`                           | exit 0, no tracked changes                                         |
| Unit tests                 | `pnpm test`                                                | all pass; coverage gates pass                                      |
| Focused preparser tests    | `pnpm test:only src/lib/preprocess/`                       | all pass                                                           |
| Types                      | `pnpm check`                                               | exit 0; zero errors; three baseline warnings permitted             |
| Format                     | `trunk fmt`                                                | exit 0; changed files only                                         |
| Lint                       | `trunk check`                                              | exit 0                                                             |
| Build/package              | `pnpm build`                                               | exit 0, publint passes; existing import.meta.env warning permitted |
| Focused production browser | `pnpm exec playwright test <test-file> --project=chromium` | all pass                                                           |

## Git and executor workflow

The conductor owns commits and integration. Do not commit, push, open PRs, edit
this plan, any guard artifacts, or the batch README. Run serially on the supplied
checkout; no other executor writes it. If the checkout/workdir differs, STOP.
Report exact commands, red-first evidence, green results, changed files,
assumptions, and blocked verification. No fake green. The conductor updates the
status index and independently reruns done criteria. No dependency changes unless
explicitly in scope. Use existing dependencies, not a new parser ecosystem.

## Scope

Only these files may be changed:

- `src/lib/SvelteMarkdown.svelte`
- `src/lib/SvelteMarkdown.test.ts`
- `src/routes/test/preprocess/async-tokens/+page.svelte`
- `src/routes/test/preprocess/async-tokens/+page.ts`
- `tests/preprocess-async-tokens.test.ts`
- `README.md`

Everything else is out of scope, including dependencies, lockfile, unrelated
streaming/parser optimizations, published package exports, and productionizing
nested Markdown. Do not silently widen scope.

## Steps

### Step 1: Prove the SSR failure before changing the component

Create the async-tokens route with a serializable paragraph token array whose
text is `Prepared async context`. In its script set document context to
`extensions: [{ async: true, walkTokens() { return Promise.resolve() } }]` and
render MarkdownDocument with the array. Add sibling +page.ts exporting
`prerender = true`. Add Playwright test using `request.get` to assert the HTTP
body contains a rendered paragraph with the text (not just embedded JSON), and
a JS-disabled context asserting visible paragraph content. A second test may
check hydrated parity. Use a test-specific selector around the document.

**Verify:** `pnpm exec playwright test tests/preprocess-async-tokens.test.ts --project=chromium`
→ the SSR/prerender assertion FAILS because text is absent, with no compile error.

### Step 2: Prioritize array source before parser scheduling

Update SvelteMarkdown token selection so Array.isArray(source) directly supplies
rawTokens before async/streaming routing. No parser, cache, async walkTokens, or
Lexer calls for arrays. Avoid resetting unrelated streaming state. Keep async
string inputs on their existing path. Strengthen the existing array+async client
test with lexical/async hook spies, replacement array, and empty-array coverage.

**Verify:** the focused Playwright command now passes; `pnpm test:only src/lib/SvelteMarkdown.test.ts`
passes including existing async strings and streaming tests.

### Step 3: Document the array contract and run final gates

Add a concise note in README's preparsed token usage: supplied arrays are ready
to render synchronously even when extensions are async; extensions do not reparse
or transform supplied arrays. Do not promise async string SSR.

**Verify:** `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test`, `pnpm build`,
and the focused Playwright command all succeed.

## Test plan

The production route is the red-first SSR regression and tests context forwarding,
not merely direct component props. Browser tests check initial/replacement/empty
arrays and zero parsing/hook calls. Existing async string and streaming tests
must stay green. Do not mock the token selection under test.

## Done criteria

- [ ] Red SSR failure recorded before fix and same test passes afterward.
- [ ] Focused async-tokens Playwright test passes on Chromium.
- [ ] `pnpm test` passes with coverage gates.
- [ ] `pnpm check`, `trunk check`, and `pnpm build` exit 0.
- [ ] Arrays render with zero Lexer/async parsing calls, including replacements.
- [ ] Existing async-string and streaming behavior remains covered.
- [ ] `git diff --check` exits 0.
- [ ] The contribution modifies only the listed paths; conductor artifacts excluded.
- [ ] The final report names all verification limitations and deviations.

## STOP conditions

- SSR reproduction passes on unchanged code: investigate the fixture instead of changing source.
- Array rendering requires executing extension hooks: report the contract conflict.
- The fix requires redesigning async string SSR or streaming: stop; that is separate.
- Live excerpts differ without an explained predecessor change.
- A fix needs out-of-scope files or a new dependency.
- A verification failure persists after two reasonable attempts.

## Maintenance notes

Future extensions must treat arrays as already processed. Revisit precedence
when token-input contracts change, not when a new async string extension is added.
