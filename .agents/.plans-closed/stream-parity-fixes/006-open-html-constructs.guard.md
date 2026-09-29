# Guard log — 006 open-html-constructs

## Checkpoint 1 — 2026-09-29 04:58 — ON TRACK (final: PASS; new findings → plan 007)

16558d2 · executor (opus, in-tree) added `isUnterminatedHtmlBlock`, `isUnsafeCut`, inline-state recording, a guard in `relexCitingRoots`; flipped the fuzz edge case; added seventeen edge blocks. Snapshot-committed.

- Guard reproduced: `pnpm test` 164 files, 1326 passed, 0 expected fail, lines 98.73%; `pnpm check` 0 errors; `trunk check` clean; `red(` count 0.
- Guard ran a third independent corpus (scratch, then committed as `ADJACENT_BLOCKS`): 22 of 220 documents diverge, two groups, one principle (adjacency without a blank line).
- Action: README row → DONE; plan 007 written and dispatched; plan 004 now depends on 007. Plan 007 requires the executor to write and beat its own 40-block corpus, so the next independent check starts from a harder baseline.
