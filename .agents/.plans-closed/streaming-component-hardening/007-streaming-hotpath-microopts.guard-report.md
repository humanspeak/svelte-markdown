# Guard report — 007 streaming-hotpath-microopts

**Recommendation: PASS** — both micro-opts are pure, behavior-preserving work-elimination; every Done criterion re-run green and both diffs proven semantically identical to the code they replace.
**Reviewed at** `d7addea` · 2026-07-08 18:14 · **Plan planned at** `939f154`
**Integrated** — PR [#349](https://github.com/humanspeak/svelte-markdown/pull/349) opened via the `pr` skill for the reviewed snapshot commit (`d7addea`).

## Done criteria

| Criterion                                                                  | Result | Evidence                                                                                                                                                                |
| -------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` exits 0                                                       | met    | `COMPLETED 1007 FILES 0 ERRORS 4 WARNINGS` (the 4 are pre-existing `state_referenced_locally` warnings in unrelated `.svelte` files)                                    |
| `pnpm test:only` exits 0; no test expectations changed                     | met    | `145 passed (145)` files, `944 passed (944)` tests; `git diff --name-only origin/main...HEAD` lists zero test files                                                     |
| `reuseStableStreamingTokens` no longer uses `.slice(...).concat(...)`      | met    | `grep "slice(0, reuseCount)\|\.concat("` → none; replaced by `new Array<Token>(nextTokens.length)` + two fill loops (`streaming-token-reuse.ts:144-154`)                |
| `canUseTailWindow` no longer contains `source.startsWith(this.prevSource)` | met    | Now `if (!isAppendOnly) return false` (`incremental-parser.ts:347`); the append fact is passed in                                                                       |
| No files outside the in-scope list modified                                | met    | Executor contribution = `incremental-parser.ts`, `streaming-token-reuse.ts` (in scope) + `README.md` (required by criteria) + guard log (guard's own)                   |
| Batch `README.md` row 007 updated; #332 noted resolved-pending-merge       | met    | Row 007 `TODO → DONE`; #332 disposition rewritten to "Residual double `startsWith` handled by 007; resolved-pending-merge on `advisor/007-streaming-hotpath-microopts`" |
| `trunk fmt && trunk check` exit 0                                          | met    | `trunk check` on both changed files → `✔ No issues`; tree stayed clean after `trunk fmt` (no formatting drift)                                                          |

## Spirit

The plan's intent is to remove two specific, avoidable pieces of per-flush work on the streaming hot path without changing any behavior — and the diff does exactly that, no more. **Part A** genuinely eliminates the two intermediate slice arrays: the reused prefix and fresh tail are written directly into one preallocated array, and I verified the loops cover `[0, nextTokens.length)` with no holes and provably in-bounds indices (`reuseCount = min(divergeAt, previousTokens.length, nextTokens.length)`), so the output is byte-identical to the old `slice+concat` while the allocation-avoidance early-return path is preserved untouched. **Part B** collapses the duplicate `startsWith` scan to one per update by threading a precomputed `isAppendOnly`; `isAppendOnlyUpdate` is character-identical to the old inline expression, and on the hot path the scan now runs exactly once (`appendIntroducesMatch` uses `slice`/`lastIndexOf`, and both of `canUseTailWindow`'s default args are supplied so no default recomputes it). No criterion was gamed, no test weakened — the existing 944-test suite is the equivalence guard and it passes unchanged. This is a clean delivery of the plan's purpose.

## Scope & conduct

- **In-scope only?** Yes. The two source files are the plan's named in-scope set; the README edit is a Done criterion; the guard log is guard's own artifact.
- **STOP conditions respected?** Yes. No excerpt/live-code mismatch (both "Current state" excerpts matched before the edit); plan 011 has not landed so Part A was still applicable; no test expectation had to change.
- **Drift since planning:** `git diff --stat 939f154..HEAD -- <in-scope source>` shows only this executor's own two files — no foreign source drift to account for.
- **Plan amendments during execution:** none. Plan `.md` untampered by the executor.
- **Notable second `startsWith`:** `incremental-parser.ts:291` (`hasNewReferenceDefinition`) retains a `startsWith`, but it is a different helper off the hot path, pre-existing, and explicitly outside Part B's scope (which targeted `canUseTailWindow` only) — not drift, not a miss.

## Residual risk / follow-ups

- **Very low risk.** Pure work-elimination with no semantic change and full existing-suite coverage as the equivalence guard. No new tests were required (the plan deliberately relies on the existing suites; a `startsWith`-spy test was judged too brittle and correctly skipped).
- **On merge:** close issue #332 (its residual is now resolved). The batch README already records this as resolved-pending-merge.
- **Maintenance note (from the plan):** if plan 011 later folds token reuse into `IncrementalParser.update()`, Part A's function may be deleted entirely — this plan just makes it cheaper in the interim.
- Merging PR #349 remains the operator's call — guard does not merge.
