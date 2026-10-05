# Guard checkpoint — streaming text API and Motion presets

## 2026-10-05T06:10-04:00 — BLOCKED

- Baseline: c2ca115. No source diff; only this untracked plan batch.
- Executor task: streaming-text-motion-sol-implementation-001, completed with a STOP report.
- Independently ran installed marked.lexer for `**a` and `**a** a`; visible leaf
  text is respectively `**a` and `a a`. Common prefix/suffix matching cannot
  preserve arrival identity for this case. Existing render keys are insufficient.
- Executor respected the plan's STOP condition and made no changes. No runtime
  feature or presets delivered; test/build gates were not run because no
  implementation exists. No final PASS or snapshot commit is warranted.
- Plan unchanged. Index marked BLOCKED by parent. Await operator agreement to
  expand investigation to parser/cleanup provenance, without weakening semantics.

## 2026-10-05 — PLAN AMENDED

Operator approved expanding investigation scope after the independently
reproduced counterexample. Added a read-only Step 0 covering parser/cleanup
provenance with exact examples and a parent-review gate. No implementation
requirements or default-behavior guarantees were relaxed.

## 2026-10-05 — PLAN AMENDED: provenance implementation checkpoint

Parent reproduced installed Lexer recursion for escaped link labels and nested
quote/list content, disappearing duplicate-definition spans, and HTMLParser2's
second empty-range callback for &NotEqualTilde;. Read actual lexAndClean,
cleanup, incremental parse and adoption sites. Accepted additive opt-in tracer
with grammar-transformation adapters and explicit unknown custom fallback.
Expanded implementation scope to parse-and-cache, cleanup, incremental parser
and dedicated provenance modules/tests. Step 1 alone is next; no API/preset
implementation before parity review. Default behavior/requirements unchanged.
