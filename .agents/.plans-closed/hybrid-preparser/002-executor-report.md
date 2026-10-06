# Opus 5.5 execution report — plan 002

Verbatim executor report; guard verdict is recorded separately.

```text
Plan 002 is done: the one new test file, `tests/preprocess-hybrid.test.ts`, passes on all five browser projects (10 of 10 tests), and every other gate in the plan exited 0. The existing fixture passed as-is, so no STOP condition came up. Nothing is committed and only that file is changed.

## Files
- **Added:** `tests/preprocess-hybrid.test.ts` (untracked).
- `git status --short` shows only `?? tests/preprocess-hybrid.test.ts`. No source, fixture, config, dependency, lockfile, plan, index or guard file was touched.

## Pre-flight
- `git status`: clean on `investigate/issue-372-md-preprocessor` at HEAD `df77a4f`.
- `git diff --stat e6195d0..HEAD -- tests/preprocess-hybrid.test.ts`: empty, so no drift.
- I read the fixture files (`+page.mdproof`, `+page.ts`, `+layout.svelte`, `TypedCounter.svelte`, `CustomHeading.svelte`, `CustomLink.svelte`) and they match the plan's description of the current state.
- Port 4173 was free, so Playwright built and started its own production preview. Preview 8237 was left alone.

## What the test covers
1. **Server rendering with JavaScript off.** It opens a separate context with JavaScript disabled and closes it in `finally`. It checks:
   - the page responds 200;
   - the greeting text;
   - the counter reads `Count: 6 / typed object`, with `data-start-type=number` and `data-details-type=object`;
   - `Parent updates: 0`, and the conditional element is absent;
   - two custom headings (depth 1 and depth 2, with their text);
   - two custom links (text and `href`);
   - the inline paragraph reads exactly `Inline page data: Hello from SvelteKit load.` with no asterisks, and the greeting is inside `<strong>`;
   - exactly one `pre code` block, with the literal text `<Counter start={6} />` and no live counter inside it.
2. **Hydration, in a normal context.**
   - Before navigating, it registers listeners for page errors, console errors and warnings, failed requests, and failed responses from the site itself. The page's own 200 status is checked separately from the asset checks.
   - It repeats all the server-rendering assertions above.
   - Clicking the counter gives `Count: 7`, `Parent updates: 1`, and makes the conditional element appear.
   - After the renderer toggle: custom headings drop to 0, the real `<h1>` and `<h2>` headings are visible, there are still two custom links, the strong greeting and code block are unchanged, and the counter state is kept.
   - Finally, the error, console-problem and asset-failure lists must all be empty. Nothing is filtered out, there are no sleeps, and every assertion uses Playwright's waiting locator checks.

## Commands and results (run one at a time)
| Command | Result |
|---|---|
| `pnpm exec playwright test tests/preprocess-hybrid.test.ts --project=chromium` | 2 passed |
| `pnpm exec playwright test tests/preprocess-hybrid.test.ts` | **10 passed**: 2 each on chromium, firefox, webkit, mobile-chrome and mobile-safari |
| `trunk fmt` | exit 0, no issues |
| `trunk check` | exit 0, no issues |
| `trunk check` / `trunk fmt` on the new file by name | no issues (run in case the untracked file was skipped) |
| `pnpm check` | exit 0: 0 errors, the 3 known warnings |
| `pnpm test` | exit 0: 168 files and 1441 tests passed; coverage 97.48% statements, 92.9% branches, 98.28% functions, 98.71% lines (all above the thresholds) |
| `pnpm test:only src/lib/preprocess/` | exit 0: 4 files, 31 tests |
| `pnpm build` | exit 0; publint "All good!"; only the known `import.meta.env` warning |
| `git diff --check`, plus a second run with the file temporarily marked for add so the untracked file was included (then unmarked) | exit 0 both times |

There were no crashes from running heavy checks concurrently, and no Playwright browser install was needed.

## Assumptions, deviations and limits
- **Waiting for hydration:** the test waits for the network to go idle before clicking, which is how the other tests in this repo do it. The page has no explicit "hydrated" signal. If hydration ever finished after that point, the click assertions would fail rather than pass falsely.
- **Hydration warnings in production:** Svelte strips its hydration-mismatch warnings from production builds. The console check therefore catches errors and warnings that still appear, but a silent mismatch can only be caught by the DOM assertions after hydration.
- **Proving the listeners fire:** I did not plant an error to prove the listeners catch a failure, because that would mean editing files outside scope. I also did not run the test as a failing test first; the plan exempts net-new tests from that.
- **Not run:** `pnpm install --frozen-lockfile`, because dependencies were already installed. No other plan command was skipped and nothing is blocked.
```
