# Guard log — 013 tail-window-boundary-does-not-close-lists

## Checkpoint 1 — 2026-09-28 06:09 — PLAN AMENDED

9ec976f · executor (opus, in-tree) delivered Step 1 and Step 2 (lists + indented code) and stopped at the plan's STOP condition "the sweep still fails at some chunk size" with a full diagnosis; work snapshot-committed.

- Reproduced by executor (guard re-runs on the next checkpoint): cases 1, 2, 4, 5 and the size-7 sweep red → green; sizes 1/32/64 still red on a heading `raw` split (`"# H\n"`+`"\n"` streamed vs `"# H"`+`"\n\n"` fresh) — pre-existing, present on unchanged code at size 1.
- Scope: only the two in-scope files changed (`git diff --stat`); deviations from the plan's code shape (`FENCE_OPEN_RE` constant, `tokens[cut]?.type` bounds guard) are sound and reported.
- Classification: PLAN DEFECT (the plan anticipated "a second continuable block type"; the second cause is instead the heading/hr stability rule). Not drift: STOP honored, no test weakened.
- Action: plan amended — Step 2c added (heading/hr no longer stable at source end), baseline re-stamped to `9ec976f`. Fix-dispatch (opus, fresh context, in-tree). `pnpm test`/`trunk` not yet run at this snapshot (executor stopped before Step 3); guard will run them at final.

## Checkpoint 2 — 2026-09-28 06:15 — PLAN AMENDED

6e1abe7 · fix executor delivered Step 2c (heading/hr unstable); sizes 32/64 green, size 1 still red on a closed fence frozen without its trailing newline. Snapshot-committed.

- Guard probed marked directly (Node, `new Lexer({gfm:true})`): every block type moves its trailing newline into the following `space` token when a blank line arrives; no block raw ever ends in `\n\n`. The per-type stability rules are therefore unsound as a class, not one by one.
- Classification: PLAN DEFECT (third variant of one mechanism). Executor honored STOP, changed no tests; `trunk` clean on both snapshots; `pnpm check` 0 errors.
- Action: Revision 2 — Step 2d: `isStableAtSourceEnd` returns false unconditionally. Fix-dispatch (opus, fresh, in-tree). Guard will re-run everything at final.

## Checkpoint 3 — 2026-09-28 06:21 — ON TRACK (final: PASS)

2fa41e4 · fix executor delivered Step 2d + Step 3; guard reproduced every done criterion (see `013-…guard-report.md`): 160 files / 1176 tests green, coverage 98.5/93.0, `pnpm check` 0 errors, `trunk check` clean, greps match, sweep asserts parity after every chunk at sizes 1/7/32/64.

- Diff read (`incremental-parser.ts:476-535`): `isStableAtSourceEnd` deleted; cut = `tokens.length - 1` with the list/indented-code walk-back; comments cite marked evidence; `canContinueAcrossBlankLine` JSDoc corrected.
- Action: README row → DONE; 006 re-dispatched from Step 3 (Step 2 verify repeated first).
