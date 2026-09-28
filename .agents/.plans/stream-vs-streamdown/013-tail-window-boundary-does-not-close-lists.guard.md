# Guard log — 013 tail-window-boundary-does-not-close-lists

## Checkpoint 1 — 2026-09-28 06:09 — PLAN AMENDED

9ec976f · executor (opus, in-tree) delivered Step 1 and Step 2 (lists + indented code) and stopped at the plan's STOP condition "the sweep still fails at some chunk size" with a full diagnosis; work snapshot-committed.

- Reproduced by executor (guard re-runs on the next checkpoint): cases 1, 2, 4, 5 and the size-7 sweep red → green; sizes 1/32/64 still red on a heading `raw` split (`"# H\n"`+`"\n"` streamed vs `"# H"`+`"\n\n"` fresh) — pre-existing, present on unchanged code at size 1.
- Scope: only the two in-scope files changed (`git diff --stat`); deviations from the plan's code shape (`FENCE_OPEN_RE` constant, `tokens[cut]?.type` bounds guard) are sound and reported.
- Classification: PLAN DEFECT (the plan anticipated "a second continuable block type"; the second cause is instead the heading/hr stability rule). Not drift: STOP honored, no test weakened.
- Action: plan amended — Step 2c added (heading/hr no longer stable at source end), baseline re-stamped to `9ec976f`. Fix-dispatch (opus, fresh context, in-tree). `pnpm test`/`trunk` not yet run at this snapshot (executor stopped before Step 3); guard will run them at final.
