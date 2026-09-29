# Guard log — 001 offset-integrity-guard

## Checkpoint 1 — 2026-09-29 03:31 — ON TRACK (final: PASS)

8805f29 · executor (opus, in-tree) delivered the integrity flag, flipped bucket A, added four guard tests. Snapshot-committed.

- Guard reproduced: `pnpm test` 163 files, 1253 passed / 14 expected fail, lines 98.68%; `pnpm check` 0 errors; `trunk check` clean on the four files; strict run fails only in buckets B, C, D.
- Diff read: `prevHasLengthMismatch`, `sumSourceLength`, `parseFullSource`, tail-only sums on both fast paths, `offsetsUnsafe` into the boundary.
- Deviation (kept-and-flagged instead of discard + full re-lex): judged sound, pinned by the LF-then-CRLF guard test.
- Action: README row → DONE; plan 002 stamped and dispatched; residual duplicate-definition case carried into plan 003's pre-flight note.
