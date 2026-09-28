# Guard log — 012 code-fence-line-nodes-spike

## Checkpoint 1 — 2026-09-28 12:45 — ON TRACK (final: PASS, kept)

9d4ef64 · executor (opus, in-tree) ran attribution (style/layout 61.7%), wrote the contract tests, implemented per-line text nodes, ran A/A, two paired repeats, extra one-repeat checks on the other fence-bearing scenarios, vs-Streamdown twice, attribution after. Snapshot-committed.

- Guard reproduced: `pnpm test` 161/1233 green (98.57% lines); `pnpm check` 0 errors; `trunk check` clean; 98 evidence runs, 0 parity mismatches; per-pair deltas read from the JSON match the report (prose-mixed −30.7/−30.8 ms medians of mixed-sign pairs).
- Diff read: `Code.svelte` `$derived.by` line split with per-line terminators, `{#each lines (index)}` inside a tight `<code>`; doc comment states the contract.
- Action: README row → DONE (KEPT); Plan 014 stamped and dispatched (batch close).
