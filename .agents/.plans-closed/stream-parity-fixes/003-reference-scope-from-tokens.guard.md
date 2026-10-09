# Guard log — 003 reference-scope-from-tokens

## Checkpoint 1 — 2026-09-29 04:12 — ON TRACK (final: PASS; new findings → plan 005)

0bfa7ab · executor (opus, in-tree) rewrote the definition decision, flipped bucket C and the tricky-corpus fuzz, updated nine implementation-pinning tests. Snapshot-committed.

- Guard reproduced: `pnpm test` 163 files, 1293 passed, 0 expected fail, lines 98.68%; `pnpm check` 0 errors; `trunk check` clean; `red(` count 0; removed helper absent.
- Guard ran an independent generative fuzz (scratch, later made permanent): 27 of 120 random documents diverge. Categorized: ~20 definition-then-title (visible), 2 whitespace-only last line (raw split), 4 duplicate-definition blank-line split (raw split, one update).
- Action: README row → DONE; fuzz committed as `incremental-parser.fuzz.test.ts` (core guard green, gap case red); plan 005 written and dispatched; plan 004 now depends on 005.
