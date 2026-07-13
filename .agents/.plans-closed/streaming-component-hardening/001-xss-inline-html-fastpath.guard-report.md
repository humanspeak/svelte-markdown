# Guard report — 001 xss-inline-html-fastpath

**Recommendation: PASS** — the default-config inline-HTML XSS is closed; every done criterion reproduced green against the corrected lint gate.
**Reviewed at** `ea7a31a` · 2026-07-07 14:42 · **Plan planned at** `939f154`
**Integrated** — executor fix commits `596480c` / `9fae0ae` / `ea7a31a`; guard artifacts + plan amendment commit `aa1d55a` · PR [#342](https://github.com/humanspeak/svelte-markdown/pull/342) · via the `commit` / `pr` skills. Merge is the operator's call.

## Done criteria

| Criterion                                                                  | Result | Evidence                                                                                                                    |
| -------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` exits 0                                                       | met    | `COMPLETED 1005 FILES 0 ERRORS` (4 pre-existing warnings, none on changed lines)                                            |
| `pnpm test:only` exits 0; script/style/div tests exist & pass              | met    | full suite `911 passed (144 files)`; the 7 new html tests all `✓`                                                           |
| `grep -n "htmlTok.tag in Html" src/lib/Parser.svelte` returns the line     | met    | `Parser.svelte:225`                                                                                                         |
| `<script>alert(1)</script>` produces no live `<script>` (asserted by test) | met    | `drops unknown script tags …` `✓`; asserts `querySelector('script')` null + text `alert(1)` preserved                       |
| No files outside in-scope list modified (executor contribution)            | met    | `git diff origin/main...HEAD` = `Parser.svelte` (+1), `SvelteMarkdown.test.ts` (+72), `README.md` (DONE row, plan-mandated) |
| Batch README 001 status row updated                                        | met    | row 25 → `DONE` (committed in `ea7a31a`)                                                                                    |
| Lint gate (amended) `trunk fmt && trunk check` exits 0                     | met    | `trunk check` on both changed files → `✔ No issues`                                                                         |

Note on base: local `main` is stale (lacks the plans). The true fork point is `origin/main` (contains the plans; `e260af6`/#341 is a genuine ancestor — no squash-merge duplication). All scope/diff claims above use `origin/main`.

## Spirit

The fix delivers `Why this matters` directly and minimally. Adding `htmlTok.tag in Html` to `inlineHtmlOk` (`Parser.svelte:225`) makes the inline fast path's eligibility check agree with the already-safe non-inline path: an unknown tag (`script`, `style`, `meta`, `base`, `object`, …) is no longer `undefined === undefined → true`, so it falls through to the general dispatch that drops the tag and renders only children. The regression tests reproduce the exact vulnerability — `<script>`/`<style>`/`<meta http-equiv=refresh>`/`<base href>` each render **no** live element, with `<script>`'s content demonstrably neutralized to text rather than silently dropped — and the `<div>`/`<iframe>` cases prove the legitimate fast path was not over-corrected. The custom-renderer test confirms the intended escape hatch (an explicit `renderers.html.script`) still routes through the non-inline branch. This is the plan's intent, not merely its checkboxes.

## Scope & conduct

- **In-scope only?** Yes for the executor's committed work — `Parser.svelte`, `SvelteMarkdown.test.ts`, plus the plan-required README status row. No touch to `sanitize.ts`, `renderers/html/**`, or the non-inline branch (all listed out-of-scope).
- **STOP conditions respected?** Yes. The `inlineHtmlOk` `@const` still matches the plan excerpt (drift check clean); no existing supported-tag test regressed; no second live-render path surfaced.
- **Plan amendments during execution:** one — **2026-07-07 (guard, operator-directed):** lint gate `pnpm lint` → `trunk fmt && trunk check` across all 12 plans + batch README. Rationale: `pnpm lint` = `prettier --check . && eslint .` (`package.json:107`) fails on pre-existing `docs/**` formatting outside every plan's scope; this repo lints via Trunk. `Planned at` SHAs deliberately **not** re-stamped (tooling-only correction; re-stamping would break the plans' `939f154` drift baselines). Dated revision recorded once in the batch README rather than 12 duplicate blockquotes.

## Residual risk / follow-ups

- **This PR carries guard's batch-wide doc amendment** (the `trunk fmt && trunk check` swap across plans 002–012 + README) alongside the 001 fix. It is doc-only and authorized, but if you prefer the 001 PR to contain only the fix, split that commit out before merging.
- **Executor work is committed as 3 conventional commits** (`596480c`, `9fae0ae`, `ea7a31a`) authored by `jason.h@kummerl.com`; guard's amendments + oversight artifacts are a separate commit.
- **Maintenance note (from the plan):** if `script`/`style`/etc. are ever added to the `Html` map (e.g. an opt-in trusted-HTML renderer), this `tag in Html` guard would make them inline-eligible again — that must be a deliberate, sanitized decision.
- **Not a full sanitizer.** This fixes tag identity only; attribute sanitization (`sanitize.ts`) remains the separate layer for `href`/`src`/`on*`/`srcdoc`, and is unchanged.
