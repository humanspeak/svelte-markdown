# Guard log — 001 xss-inline-html-fastpath

## Checkpoint 1 — 2026-07-07 14:16 — DRIFTING

`45ca5b9` (merge-base) · first checkpoint; executor has added regression tests but **not** the fix. Working tree: `src/lib/SvelteMarkdown.test.ts` staged (+56); `src/lib/Parser.svelte` untouched.

- **Core fix (Step 1) missing.** Done criterion "`grep -n "htmlTok.tag in Html" src/lib/Parser.svelte`" fails — marker ABSENT. `Parser.svelte:221-226` still holds the vulnerable `inlineHtmlOk` (`renderers.html[tag] === Html[tag]` with no `tag in Html` membership guard). `git diff 939f154..HEAD -- src/lib/Parser.svelte` is empty. The XSS the plan exists to close is still open.
- **Regression tests are legitimate and correctly RED.** `pnpm test:only src/lib/SvelteMarkdown.test.ts` → 2 failed / 70 passed. `<script>` case fails at `SvelteMarkdown.test.ts:827` (live `<script>` rendered); `<style>` case fails at `:836` (received `<style>*{color:red}</style>`). These failures _are_ the vulnerability reproducing — the tests are well-formed, not gamed; they simply have no fix to pass against.
- **Done criteria unmet:** `pnpm test:only` would exit non-zero; README 001 row still `TODO` (`README.md:17`); "no live `<script>`" test is failing, not passing.
- **No violations.** All edits in-scope (`SvelteMarkdown.test.ts` only); `Parser.svelte`, `renderers/html/**`, `sanitize.ts`, non-inline branch all untouched; plan file unmodified; no STOP condition skipped (drift check clean — plan still matches live code). One extra test beyond the plan's four cases ("script via explicitly approved custom renderer", `:838-853`) — additive, in-scope, reasonable; not a concern.
- Action: reported to operator. Blocking gap = apply Step 1 (`htmlTok.tag in Html` guard in `inlineHtmlOk`, `Parser.svelte:221-226`); the two red tests should then go green. Not integrable in this state.

## Checkpoint 2 — 2026-07-07 14:19 — ON TRACK (tests only)

`45ca5b9` · operator clarified the red tests are intentional (TDD red-phase first); Step 1 fix deliberately deferred. Re-scoped this checkpoint to test-shape review only.

- Tests match the plan's Step 2 case list exactly (script, style, div, iframe) plus one additive opt-in case. Security invariant asserted correctly: `querySelector('script'|'style')` null, and content preserved as text (`toContain('alert(1)')` / `'*{color:red}'`) — proves neutralize-to-text, not silent drop.
- Custom-renderer test (`:838-853`) is valid and green-able post-fix: fixture `ClickRenderer.svelte:7` emits `<button data-testid="custom-tag-component">{children}</button>`; post-fix `script` routes to the non-inline branch (`'script' in renderers.html`) → renders it. Guards against over-blocking the opt-in path.
- div/iframe cases currently green (in `Html` map, unaffected) — correct over-correction guards.
- Optional strengthening (not required by plan): add `<meta http-equiv=refresh>` and `<base href>` cases — both named in "Why this matters" as taking effect, cheap to add, highest-value remaining regressions.
- Action: reported to operator — tests are the right shape. Next: apply Step 1.

## Checkpoint 3 — 2026-07-07 14:36 — ON TRACK (fix landed) + PLAN AMENDED

`e260af6` HEAD; fix in working tree (uncommitted). Re-ran the plan's own done criteria.

- **Step 1 fix present and correct.** `Parser.svelte:225` adds `htmlTok.tag in Html &&` to `inlineHtmlOk` — exactly the plan's load-bearing change, one line, nothing else touched in that file. Done-criterion grep passes.
- **Done criteria reproduced green (self-run, not trusted):** `pnpm check` → 0 errors (4 pre-existing warnings, none in changed lines); `pnpm test:only src/lib/SvelteMarkdown.test.ts` → 74 passed; `pnpm test:only` (full) → 911 passed / 144 files. The two previously-red script/style tests now pass; div/iframe stayed green.
- **Tests expanded beyond checkpoint 2** to include the suggested `<meta http-equiv=refresh>` and `<base href>` cases (`SvelteMarkdown.test.ts` +72 vs main). All in-scope, all asserting `querySelector(tag)` null. Good hardening.
- **Scope clean.** Working-tree source changes limited to in-scope `Parser.svelte` (+1) and `SvelteMarkdown.test.ts` (+72); README 001 row → `DONE`. No out-of-scope files, no plan-file tampering by the executor.
- **PLAN AMENDED (operator-directed).** Lint gate `pnpm lint` → `trunk fmt && trunk check` across all 12 plans + batch README. Rationale: `pnpm lint` = `prettier --check . && eslint .` (`package.json:107`) fails on pre-existing `docs/**` formatting outside every plan's scope; repo lints via Trunk. `Planned at` SHAs deliberately NOT re-stamped — tooling-only correction, no source-baseline change, and re-stamping would corrupt the plans' `939f154` drift checks. Deviation from single-plan amend protocol: recorded the dated revision once in the batch README (all executors read it first) rather than 12 duplicate blockquotes; flagged to operator.
- Action: reported to operator. Fix is verified against the corrected gate (`trunk check`) pending — see note. Not yet committed; awaiting operator go-ahead for `guard 01 final` / integration.

## Checkpoint 4 — 2026-07-07 14:42 — PASS (final close-out)

`ea7a31a` HEAD; executor committed the work as 3 conventional commits (`596480c`, `9fae0ae`, `ea7a31a`) since checkpoint 3. Corrected base = `origin/main` (local `main` is stale; `e260af6`/#341 is a genuine ancestor of origin/main — no squash-dup trap).

- All 7 done criteria reproduced green (self-run): `pnpm check` 0 errors; `pnpm test:only` 911 passed; marker at `Parser.svelte:225`; script test asserts no live `<script>`; scope clean vs `origin/main` (Parser +1, test +72, README DONE row); `trunk check` on both files → No issues.
- Spirit met: inline fast path now agrees with the safe non-inline path; unknown dangerous tags fall through and are dropped. Tests reproduce the vuln and guard against over-correction + confirm the opt-in path.
- Close-out report written: `001-xss-inline-html-fastpath.guard-report.md` → **PASS**.
- Action: integrating — commit (guard amendments + oversight artifacts; source already committed by executor) + open PR via the `commit`/`pr` skills. Merge remains the operator's call.
