# Guard report — 009 lint-test-files-and-typed-lint

**Recommendation: PASS** — every done criterion reproduced green by guard, and the type-aware promise rules are proven active in all three parser paths rather than merely configured.
**Reviewed at** `0f77f55` · 2026-07-09 14:13 · **Plan planned at** `939f154`
**Integrated** — PR opened via the `pr` skill for the reviewed snapshot commit (`0f77f55`). See "Integration" below.

## Done criteria

| Criterion                                                                     | Result | Evidence                                                                                                                                                                              |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `'**/*.test.ts'` no longer in top-level `ignores`                             | met    | `eslint.config.mjs:27-31` — only `**/dist` remains alongside the lockfiles                                                                                                            |
| `no-floating-promises` active and provably catches a floating promise         | met    | `trunk check` on three throwaway files → fires in `.ts` (2:5), `.test.ts` (4:9), `.svelte` (4:9). Files deleted, `git status` clean. Re-run against this snapshot, not checkpoint 1's |
| `trunk fmt && trunk check` exit 0; `trunk check --all` exit 0                 | met    | `trunk check --all` → `Checked 575 files · ✔ No issues`                                                                                                                               |
| Violations fixed or justified via Trunk inline ignore, never `eslint-disable` | met    | `git diff 1ba528d...HEAD -- src tests`: `eslint-disable` → 0 hits; `trunk-ignore` → exactly 1, at `parse-and-cache.ts:128`, with rationale                                            |
| No rule switched `'off'` to force green                                       | met    | `await-thenable` restored to `['error']` (`eslint.config.mjs:95`); six remaining `'off'` rules audited with counts below                                                              |
| Every `'off'` rule reported with rationale + violation count                  | met    | See "Rule-disable audit". Recorded here rather than in an executor report — see the note on that criterion                                                                            |
| `pnpm check` exits 0; `pnpm test:only` exits 0                                | met    | `pnpm check` → 1004 files, 0 errors. `pnpm test:only` → 142 files, 917 tests, all pass                                                                                                |
| Batch `README.md` status row for 009 updated                                  | met    | Row 009 → `DONE`                                                                                                                                                                      |

Drift check (`git diff --stat 939f154..HEAD -- eslint.config.mjs`) was empty at execution start (checkpoint 1). It now reports 36 insertions — that is this plan's own change to that file, not external drift.

## Spirit

The plan exists because a promise-heavy streaming library had two lint blind spots: ~150 unlinted test files, and no type information reaching `no-floating-promises` / `no-misused-promises`. Both are genuinely closed, and I verified it the hard way rather than trusting a green `trunk check`: a floating promise now errors in a plain `.ts`, inside a `.test.ts` (proving the newly-linted files actually reach type info), and inside a `.svelte` file (the plan's named risk, and the path most likely to be silently inactive — a config can look right while the Svelte parser never wires up type services at all).

The strongest evidence that this is real-bug-prevention and not cosmetics came from the correction cycle. Checkpoint 1 found `await-thenable` blanket-disabled; the plan's own maintenance note tells the reviewer to reject exactly that. Restoring it surfaced four genuine `await <non-Promise>` sites where Playwright `Locator`s were being awaited. Those are behaviourally inert but precisely the confusion the plan is meant to catch, and they would have shipped invisibly. The single false positive that motivated the disable (`parse-and-cache.ts:128`, where marked types `walkTokens` as `void`-returning and so hides the real promises async callbacks put in the result array) is now suppressed the way the plan prescribes — one inline `trunk-ignore` with a stated reason, not a global kill switch.

The `void`-marked fire-and-forget promises each carry the one-line rationale the plan demanded (`MermaidRenderer.svelte:38,45,61`, `incremental-parser.ts:540`, `parse-and-cache.ts:78`, three test routes). `incremental-parser.ts:540` also quietly fixes a latent bug: `newTokens.forEach(this.options.walkTokens)` fed `(token, index, array)` into a one-argument callback; the `for…of` rewrite passes only `token`.

## Scope & conduct

- **In-scope only?** Two crossings, both cosmetic and non-blocking. `.coderabbit.yaml:71` (`labels: ['coderabbit']` → `[coderabbit]`) is an incidental `trunk fmt` requote of a file the plan never listed; reverting it would only make `trunk fmt` redo it. The executor also edited a plan file — `008-remove-dead-html-code.md:36`, a markdownlint fence fix. Plans are guard's to write, so this is flagged in both checkpoints; it altered no contract text.
- **STOP conditions respected?** Yes. No source drift at start. Typed linting resolved `.svelte` files without parser rework beyond `extraFileExtensions` + `svelteConfig`, so the second STOP never triggered, and lint time is fine (`trunk check --all`, 575 files, ~39s). The third STOP — a real floating-promise bug in `src/lib/**` — did not fire: the four `await`-on-`Locator` finds are in `tests/`, not `src/lib`, and are inert.
- **Plan amendments during execution:** one, 2026-07-09, operator-directed. Plan 009 was the last plan hardcoding raw ESLint (`pnpm exec eslint .` ×4); CLAUDE.md makes Trunk the source of truth. Replaced with `trunk check` / `trunk check --all`. Step 3 was **strengthened** to require proving the rule in all three parser paths, and the done criteria were **strengthened** with `trunk check --all` plus a rationale-and-count requirement for any `'off'` rule. `Planned at` deliberately left at `939f154`, matching the batch README's 2026-07-07 precedent: a tooling-command correction changes no source baseline, so the drift check must keep pointing at the audited commit.

## Rule-disable audit

Six `recommendedTypeChecked` rules remain `'off'`. Measured, not assumed — scoped to `src/lib/utils` + `SvelteMarkdown.svelte`:

| Rule                            | Violations (subset) | Assessment                                           |
| ------------------------------- | ------------------- | ---------------------------------------------------- |
| `no-unsafe-member-access`       | 29                  | Migration exemption — marked's `Token` union         |
| `no-unnecessary-type-assertion` | 17                  | Stylistic; not correctness                           |
| `no-unsafe-argument`            | 6                   | Migration exemption                                  |
| `no-unsafe-assignment`          | 4                   | Migration exemption                                  |
| `no-unsafe-return`              | 3                   | Migration exemption                                  |
| `require-await`                 | 2                   | Stylistic; an `async` fn without `await` is harmless |
| `no-unsafe-call`                | 2                   | Migration exemption                                  |

None is promise-correctness. The `no-unsafe-*` family (44 in this subset alone) is the ordinary cost of adopting typed lint against `marked`'s types and `HtmlRenderers`' `[key: string]: Component<any, any, any>` index signature (`src/lib/renderers/html/index.ts:107`); clearing it is separate work. The one rule where a disable genuinely hid promise risk — `await-thenable` — is back on.

**A note on that criterion, stated plainly because it is a judgment call the operator may overrule.** "Every `'off'` rule reported with rationale + count" is a criterion _guard added at checkpoint 1_, after the executor had already done the work. Holding an executor to a goalpost moved in behind it would be unfair, and dropping it silently to wave the work through would be the laundering this role exists to prevent. So guard did the measurement itself and recorded it above: the criterion's substance — that no disabled rule hides a real problem — is verified, not waived. What is genuinely missing is an inline rationale comment in `eslint.config.mjs`; that is a follow-up, not a merge blocker.

## Corrections to guard's own earlier claims

Both are in the log; repeated here because a report that hides its own misfires isn't evidence.

- Checkpoint 1 suspected `rendererKeys.ts:41` had widened the public `htmlRendererKeys` export from `HtmlKey[]` to `string[]`. It had not. `HtmlRenderers` carries an index signature, so `HtmlKey` already collapses to `string`; the assertion was genuinely unnecessary and its removal is a no-op on the exported type.
- Guard briefly measured `await-thenable` at "0 violations." That number came from a run it had killed, not a clean result. The true count is 1, at `parse-and-cache.ts:128`.

## Residual risk / follow-ups

- **Typed lint is slow outside Trunk.** A full-repo `pnpm exec eslint .` did not finish in 12 minutes under this config; `trunk check --all` does the same work in ~39s because of Trunk's caching and change-scoping. This is now written into the plan and the batch README. Anyone reaching for raw ESLint will be badly surprised.
- **`eslint.config.mjs` carries no inline rationale** for the six `'off'` rules. Worth a small follow-up plan to either fix the ~63 violations or comment the exemptions at the call site, so the reasoning survives without this report.
- **New source dirs silently lose typed coverage** if they fall outside the tsconfig that `projectService` resolves — the plan's own maintenance note, still true.
- **E2E is red locally, and it predates this branch.** `tests/issues/issue-192.test.ts` and `tests/reactivity.test.ts` fail with `Test timeout … waiting for getByRole(...)`. Guard restored the pre-edit version of `issue-192.test.ts` from `0418585` (identical to `1ba528d`'s, still carrying `await page.getByRole(...)`) and it **failed identically** — so the executor's `await` removals are not the cause, and could not be: `await` on a non-thenable `Locator` is a no-op. E2E sits outside this plan's Done criteria; CI is the authority. A merger should still know these specs do not pass on a local run today.
- `{files: ['*.ts'], ...disableTypeChecked}` (`eslint.config.mjs:107-110`) exempts only repo-root configs (`playwright.config.ts`, `vite.config.ts`, `vitest.setup.ts`) — correct as written. If anyone "fixes" that glob to `**/*.ts`, it would silently disable every type-aware rule in the repo. Leave it alone.

## Integration

The reviewed snapshot is `0f77f55`. Two commits carry the executor's work (`0418585`, `0f77f55`); guard's log and the plan amendment are separate commits. PR opened via the `pr` skill against `main`. **Merging is the operator's call — guard never merges.**
