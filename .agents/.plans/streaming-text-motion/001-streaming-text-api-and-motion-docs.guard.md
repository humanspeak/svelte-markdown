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

## 2026-10-05T07:16-04:00 — DRIFTING: incomplete Step 1 checkpoint

- Source edits are within approved provenance scope. Executor correctly stopped
  and did not claim completion or edit plans. No API/presets/docs delivered yet.
- Parent reproduced required six-file suite: 276 pass, 1 fail. At tracer.ts:286
  blockquote raw adapter expects contiguous source; Marked constructs an extra
  newline for `> - a\nlazy a\n>   a`. Reproduced directly with installed Lexer.
- Parent reproduced pnpm check: missing renderers/childTokens on extension fixture,
  one error and three existing warnings. Trunk check: nine new issues including
  resolver complexity 67 vs allowed 15 and unused/prefer-const failures.
- Review concern: collector.capture recursively walks all supplied occurrences;
  cache unchanged occurrences before component integration. Probe normalization
  currently repeats whole-frame normalization per block probe; cache that value.
- Action: correction dispatch to Sol within unchanged scope. No source authored
  by guard. Snapshot commit not made while required hooks would reject these
  known type/lint failures; source remains a reviewable uncommitted partial diff.

## 2026-10-05T07:33-04:00 — ON TRACK: Step 1 provenance checkpoint

- Independently reproduced six-file focused suite: 335 tests pass, six files
  pass, exit 0. pnpm check exits 0 with zero errors/three existing warnings.
  Trunk check exits 0, no issues; git diff --check has no output.
- Read mapped-string helpers, collector cache/invalidation, frame tracer, grammar
  adapters, cleanup changes, incremental base plumbing and meaningful regression
  assertions. Lazy continuation records synthetic runs with no fake origin.
- Tests exercise 28 documents at every two-chunk split, exact repeated origins,
  quote/list/task/table/pedantic transformations, targeted reference relex and
  actual clone/reuse rebinding. Work counters expose completed-subtree cache hits.
- Source scope matches plan; no dependencies, public API, Motion, docs runtime
  or transport changes yet. Step 1 accepted only, not overall feature PASS.
- Action: snapshot accepted checkpoint, rebaseline plan to that snapshot and
  dispatch Steps 2–5. Full coverage/packaging/E2E are pending final feature gates.
