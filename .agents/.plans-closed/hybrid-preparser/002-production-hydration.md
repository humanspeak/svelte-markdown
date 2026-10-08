# Plan 002: Gate hybrid prerendering and hydration in Playwright

> **Executor instructions:** Read this entire plan; follow steps in order and
> run each verification. Honor STOP conditions. The conductor maintains index.
>
> **Drift check (first):** `git diff --stat e6195d0..HEAD -- tests/preprocess-hybrid.test.ts`.
> Compare the current-state excerpts if paths changed; STOP on unexplained drift.
> Also inspect `git status --short`; unrelated pre-existing edits must not be
> staged, reformatted, or included in your report as your work.

## Status

- **Priority:** P1
- **Effort:** S
- **Risk:** LOW
- **Depends on:** 001 DONE
- **Category:** tests
- **Planned at:** commit `e6195d0`, 2026-10-06

## Why this matters

Manual production checks established the architectural proof, but CI cannot
currently detect SSR-to-hydration regressions. Add durable checks using the
existing production fixture without changing its behavior.

## Current state

`hybrid-render.test.ts:37` mounts the compiled Proof client component directly;
`hybrid.test.ts:68` only checks server/client compiler acceptance. The route
`/test/preprocess/hybrid` is prerendered by +page.ts and starts with data.greeting
`Hello from SvelteKit load`, data.start 6. TypedCounter button has testid
`typed-counter`, data-start-type `number`, data-details-type `object`.
Layout has `toggle-renderer`; initial custom-heading count2, custom-link count2.
Counter callback updates `parent-changes`; `conditional` appears after a click.
An inline paragraph contains `Inline page data: **{data.greeting}**.` and must
render the greeting inside strong with no literal asterisks. Its code sample
`<Counter start={6} />` must remain literal code. Playwright config already builds
and starts production preview and includes five browser projects.

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

- `tests/preprocess-hybrid.test.ts`

Everything else is out of scope, including dependencies, lockfile, unrelated
streaming/parser optimizations, published package exports, and productionizing
nested Markdown. Do not silently widen scope.

## Steps

### Step 1: Assert server-rendered output independently of JavaScript

Create tests/preprocess-hybrid.test.ts, matching tests/issues/issue-210.test.ts.
Use a JavaScript-disabled browser context to check initial greeting, counter6,
custom headings/links, strong inline greeting, and literal fenced-code sample.
Close the context in finally. Also check response status200. This is net-new
verification coverage; a failing runtime test first is not required because the
current fixture is expected to satisfy this test.

**Verify:** `pnpm exec playwright test tests/preprocess-hybrid.test.ts --project=chromium`
→ SSR assertions pass on current production build.

### Step 2: Assert hydration and reactive renderer composition

Before navigating register pageerror and console error/warning listeners. Capture
failed requests and unsuccessful local asset responses. After initial assertions,
click typed-counter: Count7, Parent updates1, conditional visible. Toggle renderer:
custom headings disappear, semantic heading remains, custom links count2 stays.
Assert strong inline greeting and code sample remain correct. Assert no browser
exceptions, hydration warnings, asset failures. Do not filter new errors away or
use sleeps; use locator assertions. Separate expected page navigation from asset
checks, and exclude unrelated browser telemetry only if documented with evidence.

**Verify:** the focused command passes.

### Step 3: Exercise the supported browser matrix

**Verify:** `pnpm exec playwright test tests/preprocess-hybrid.test.ts` → all five
configured browser projects pass. Also `trunk fmt`, `trunk check`, `pnpm check`,
`pnpm test`, and `pnpm build` pass. If browser binaries missing, conductor can
bootstrap `pnpm exec playwright install`; do not claim unrun projects green.

## Test plan

Net-new test infrastructure is exempt from red-first. Test SSR with JavaScript
disabled and hydration in a separate ordinary context so client rendering cannot
hide missing SSR. Exact DOM selectors and event effects are contract assertions.

## Done criteria

- [ ] Focused hybrid tests pass on all five configured projects.
- [ ] SSR is checked before hydration, independently of client JavaScript.
- [ ] Counter/callback/conditional/renderer toggles are checked.
- [ ] Literal code and strong interpolation are checked.
- [ ] Console hydration warnings, page errors, and failed local assets fail the test.
- [ ] `pnpm test`, `pnpm check`, `trunk check`, `pnpm build` exit 0.
- [ ] `git diff --check` exits 0.
- [ ] The contribution modifies only the listed paths; conductor artifacts excluded.
- [ ] The final report names all verification limitations and deviations.

## STOP conditions

- Existing fixture fails: report the exact behavior; do not change source or weaken assertions.
- A browser is unavailable after installation attempt: report blocked project.
- Test requires changing fixture or Playwright config: ask conductor for plan amendment.
- Live excerpts differ without an explained predecessor change.
- A fix needs out-of-scope files or a new dependency.
- A verification failure persists after two reasonable attempts.

## Maintenance notes

This is the product integration tripwire. Expand it when routing/nesting changes;
keep unit tests for lexical edge cases rather than adding many slow browser cases.
