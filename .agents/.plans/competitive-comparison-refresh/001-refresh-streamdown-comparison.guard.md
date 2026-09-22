# Guard log — 001 Streamdown comparison refresh

## Checkpoint 1 — 2026-09-22 06:46 — PLAN AMENDED

Preflight source baseline `f7d3a60`; current tip `97de3f8`.

- Plan 002 changed only docs-kit lock resolution in this plan's source scope.
- Comparison data, benchmark script/route, root manifest and config unchanged
  from original baseline 1767041; registry latest verified as 4.2.0.
- Nightly state differs intentionally and is preserved from the pre-dispatch backup.
- Executor owns source; guard runs installs/lock generation and browser evidence.
- Durable evidence references will use the eventual retired batch path.
- Action: dispatch factual copy and exact dependency pin, measure before closing findings.

## Checkpoint 2 — 2026-09-22 06:56 — ON TRACK

Source snapshot `a01c72b` · factual corrections and exact 4.2.0 pin.

- Full source/lock diff reviewed: only Streamdown object, manifest pin and required
  transitive dependency changes. Installed package confirms 4.2.0.
- Snapshot Trunk/root-check hooks passed; production build/publint passed; docs
  check has 0 errors, 1 existing unused CSS warning. Harness unchanged.
- Guard ran two full production suites sequentially: 80 measured runs total, both
  exit 0, full JSON parsed, no page errors or text-length mismatch.
- Semantic spot-check confirms all planned block types and matching content;
  list/table aggregate text differs only in whitespace. No buttons/highlighting.
- Evidence README records metadata, every result/formula and variance. DOM counts
  coincide with old numbers but are independently stable against 4.2.0.
- Unit suite and coverage gates passed; see retained output.
- Next: executor updates all numerical copy and narrowly resolves state/config
  using this evidence; guard then checks generated/rendered docs.

## Checkpoint 3 — 2026-09-22 07:03 — ON TRACK (final PASS)

Final source snapshot `2889ce0`; measured copy `be20309`; benchmark source `a01c72b`.

- Read full factual/numerical/config/state source diffs. Values reconcile to both
  captured suites and documented formulas, with per-workload ranges and frame tie.
- All four version records agree on 4.2.0; only the three resolved findings removed.
  Findings status now uses the durable retired path without temporary-location text.
- Guard production docs build passed; 24 rendered feature rows present. The four
  changed rows/notes, 20 pros, 6 competitor cons and verdict match canonical data.
  Generated comparison Markdown and llms-full match those exact strings. Zero
  browser page errors. See rendered-comparison.json and final build/type logs.
- Root unit suite: 154 files / 1,084 tests pass; coverage 96.98% statements,
  91.87% branches, 98.05% functions, 98.05% lines. Thresholds unchanged.
- Root checks and Trunk passed final source hooks. Final docs check: 0 errors,
  1 existing CSS warning; frozen install and diff checks pass.
- Other competitor objects/ours data independently compared with baseline: equal.
  Unrelated nightly state compared with pre-dispatch backup: equal after excluding
  this Streamdown validation block. Staging isolated that block through commit
  hooks, then restored the preserved nightly working copy.
- Library/harness untouched. Guard stopped both preview sessions it started.
- Guard updated status and will retire batch; PR/deployment remain future actions.
