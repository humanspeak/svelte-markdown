# Guard log — 004 regression-bench-and-docs

## Checkpoint 1 — 2026-09-29 — ON TRACK (final: PASS)

Working tree at 5516170 · executor (opus, in-tree) added the `loose-ordered-list` and `html-blocks` bench scenarios, ran the A/A control, the paired A/B against `119cc58` twice on six scenarios, and ours against Streamdown twice on four; archived 22 run logs with JSON under `evidence/004/`; updated the docs and the compare row.

- Guard reproduced: `pnpm test` 164 files, 1410 passed, lines 98.76%; `pnpm check` 0 errors, 3 warnings (unchanged); docs `pnpm check` 0 errors, 1 warning (existing); `trunk check` clean. No file under `src/lib/` changed.
- Guard did not re-run the benchmarks; the numbers are the executor's, with logs and JSON archived.
- Guard read every changed docs line. Wording is plain, and every number printed is in `evidence/004/` or was already in `evidence/014/`.
- Guard change (docs only): the compare page's `Streaming Speed` row now also names HTML blocks among the cases where Streamdown does less work, so it agrees with the benchmarks page. The executor had flagged the mismatch and left it, as its plan allowed one row only.
- Action: README row → DONE; batch closed.
