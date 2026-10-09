# Guard report — 014 final-measurement-and-claims

**Recommendation: PASS** — two full paired suites of the finished build against svelte-streamdown 4.2.0 with parity 0 on all 210 runs, an acceptance-contract table that records unmet items as unmet, public claims rewritten from those numbers with every required caveat (including the two scenarios where Streamdown still does less work), and the README API notes the repo rule requires.
**Reviewed at** 74d972a · 2026-09-28 13:31 · **Plan planned at** 35bb92a
**Integrated** — no PR yet: batch convention is one branch → one PR at batch close; the batch is now closed and the PR is the operator's decision. Snapshots `ee8b9c3` (evidence + superseded note) and `74d972a` (docs + README).

## Done criteria

| Criterion                                                                                                     | Result | Evidence                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evidence/014/` has two full paired suites (JSON + log), attribution runs, README with the contract table     | met    | `final-run-{1,2}.{log,json}`, `attribution/` (six scenarios), `README.md`, `summary.txt`                                                                                                                                                                          |
| Parity 0 on every scenario in both suites                                                                     | met    | guard re-read both JSONs: 210 runs, 0 mismatches, 0 page errors                                                                                                                                                                                                   |
| `compare-data.ts` claims cite only 2026-09-28 paired numbers with caveats; config `measures` updated          | met    | `grep 2026-09-27` → 0; note carries: not-like-for-like citations (0 vs 258 links), fence per-line wrappers, forced whole-document layout, machine-specific ms / ratios are the claim; `us`/`them`/`consUs` name the two scenarios where Streamdown does less work |
| Superseded note in the closed evidence README                                                                 | met    | two-line note at the top pointing at 006 and 014                                                                                                                                                                                                                  |
| README documents `update(source, appendsTo?)`, `reusedPrefixCount`, optional `parsed`, list/table child props | met    | `README.md:1019`, `:1028`, `:1055`, `:1114`                                                                                                                                                                                                                       |
| `pnpm check` 0 errors; `pnpm test` green; `trunk check` clean; docs check 0 `compare-data` errors             | met    | `0 ERRORS`; 161 files / 1233 tests, lines 98.57%; `✔ No issues`; docs ERROR lines mentioning compare-data.ts: 0 (the one non-error line is a pre-existing Vite loader warning, present with the change stashed)                                                   |
| No files outside scope modified                                                                               | met    | evidence/014, compare-data.ts, config.json, closed evidence README, README.md                                                                                                                                                                                     |

## Spirit

The batch began by retracting a claim that could not survive a second look. This plan ends it with numbers that can: paired, alternating, parity-checked, on a clamped metric, with the losses stated in the same sentence as the wins. Guard cross-checked every ratio in the claim text against the archived JSON (prose 1.21–1.26×, prose at four updates per frame 2.05–2.16×, long list 2.51–2.68×, long table 2.28–2.31×, prefix-384kb 2.69–2.70×, code fence 0.75×, citations 0.85–0.96×). Spirit met.

## Scope & conduct

- In-scope only: yes (one extra attribution run, `prefix-24kb`, so the bounded-work row compares within one capture — sound).
- STOP conditions: none fired (no scenario regressed vs the 006 baseline; load stayed under 4).
- Plan amendments: none.

## Residual risk / follow-ups

- Attribution is one traced run per scenario and tracing inflates `prefix-384kb` (21 vs 13.5 ms/frame untraced); the suites, not the traces, back the claims.
- Comparisons to the Plan 006 baseline cross captures (machine drift up to −39% on Streamdown's own totals); paired deltas within a capture are the reliable signal, and the claims use only within-capture numbers.
