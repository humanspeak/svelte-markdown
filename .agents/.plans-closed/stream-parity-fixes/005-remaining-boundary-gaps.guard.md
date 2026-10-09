# Guard log — 005 remaining-boundary-gaps

## Checkpoint 1 — 2026-09-29 04:29 — ON TRACK (final: PASS; new findings → plan 006)

cfbb204 · executor (opus, in-tree) fixed the three mechanisms, consolidated the boundary rules into `countHeldTokens`, flipped the fuzz gap case, added twelve gap blocks. Snapshot-committed.

- Guard reproduced: `pnpm test` 164 files, 1305 passed, 0 expected fail, lines 98.69%; `pnpm check` 0 errors; `trunk check` clean; `red(` count 0.
- Guard ran a second independent corpus (scratch, then committed as `EDGE_BLOCKS`): 17 of 150 documents diverge; 6 of the 7 failures in the committed red case are an unclosed HTML comment, 1 is a `<li>` / closing-tag boundary.
- Action: README row → DONE; plan 006 written and dispatched; plan 004 now depends on 006.
