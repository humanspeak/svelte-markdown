# Guard log — 008 semantic-token-equality

## Checkpoint 1 — 2026-09-28 05:49 — PLAN AMENDED

f470a91 · executor (opus, worktree) reported Steps 1–3 done with one red test; diff applied to `perf/stream-bench-flush-timing` and snapshot-committed.

- Reproduced: `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/streaming-token-reuse.test.ts` → 90 passed, 1 failed: `keeps semantic parity after every chunk while a reference URL completes` — `root 0 for "See [ref].\n\n[ref]: https": expected false to be true`.
- Reproduced done-criteria greps: same-object fast path (`if (a === b) return true`, `streaming-token-reuse.ts`) and function guard (`typeof previousValue === 'function'`) present.
- Scope: only the three in-scope files changed (`git status`); executor did not edit plan/README/guard files; did not commit. Worktree was based on `307b548` (origin/main +1), not the batch tip — executor read the plan via `git show d63ccfb:…`; diff applied cleanly (`git apply --check`).
- Classification: PLAN DEFECT, not drift. The plan asserted the comparator hole is masked because reference-sensitive updates disable reuse; execution proved a path where the parser never re-lexes the citing paragraph while a definition's URL streams (`appendIntroducesMatch` returns false for an already-matching boundary line, `incremental-parser.ts:276-286`). The comparator cannot repair tokens the parser does not re-lex. This is a pre-existing correctness bug (stale href) independent of this plan's change.
- Action: plan amended in place (Revision 2026-09-28): scope widened to `incremental-parser.ts` for Step 2b only, Step 2b added with the mechanical fix, `Planned at` re-stamped to `f470a91`, done criteria gained the parity-test row. Fix-dispatch to the same executor family (opus, fresh context, no worktree isolation because the harness worktree base did not include the batch tip). Operator delegated autonomy for this batch ("come back only on STOP or completion"); amendment recorded here for review.

## Checkpoint 2 — 2026-09-28 06:03 — ON TRACK (final: PASS)

6892589 · fix executor (opus, in-tree) delivered Step 2b; guard reproduced every done criterion (see `008-semantic-token-equality.guard-report.md`).

- `pnpm test` 160 files / 1167 tests green, coverage 98.5/93.0/98.2; `pnpm check` 0 errors; `trunk check` clean on the four touched files; both greps match.
- Executor deviated from the Step 2b snippet (check order, skip line-break-leading appends, helper extraction) because the plan's literal code broke two pinned bookkeeping tests and the lint complexity limit; the plan itself mandates fixing the implementation rather than the tests. Guard read the diff (`incremental-parser.ts:291-320`, `:594-599`): sound.
- Action: README row → DONE; no PR (batch convention); Plan 013 stamped at 6892589 and dispatched next.
