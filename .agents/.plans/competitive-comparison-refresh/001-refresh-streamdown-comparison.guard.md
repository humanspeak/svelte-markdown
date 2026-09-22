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
