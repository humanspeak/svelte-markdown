# Guard log — 010 list-and-table-render-work-attribution

## Checkpoint 1 — 2026-09-28 10:53 — ON TRACK (final: PASS; zero-frame target partial)

2c49561 · executor (opus, in-tree) added `long-table`, attributed H1–H4, fixed H1/H2 (`childRest`) and H3 (render-metadata skips), ran paired A/B twice plus two 9-pair prose tiebreaks and vs-Streamdown twice, attribution before/after. Snapshot-committed.

- Guard reproduced: `pnpm test` 160/1198 green (98.6% lines); `pnpm check` 0 errors; `trunk check` clean; 136 evidence runs, 0 parity mismatches; A/B and vs-Streamdown medians match the report.
- Diff read: `Parser.svelte` `pickChildRest` + `childRest` `$derived.by` (list/table branches only); `render-metadata.ts` `keyedSubtreeOffsets` WeakMap + `headingFreeSubtrees` WeakSet gated on source-backed passes. Sound.
- Action: README row → DONE (zero-frame target partial; residual to 011); Plan 011 pre-flighted and dispatched next; 012 after it (serial to keep timing runs clean).
