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

## 2026-10-05T07:52-04:00 — BLOCKED: Motion output whitespace

- Executor Steps 2–5 incomplete; source diff preserved, no docs/README/E2E fixture
  yet. Verbatim report preserved in 005-api-presets-implementation-report.md.
- Parent reproduced preset suite: four pass/four fail. Single a renders `"a "`;
  grapheme text gains a trailing space for every MotionSpan.
- Read installed MotionSpan/_MotionContainer sources and compiled container with
  Svelte compiler: original root is from_html(`<!> <!>`); adjacent element/html
  output compiles from_html(`<!><!>`). This proves dependency output whitespace,
  not an input segment or caller indentation issue. Published Motion 2.0.0
  tarball retains the same separated template; no version bump assumed sufficient.
- Parent transpiled helper in memory and reproduced word segmentation defect:
  update("can'") then update("can't") gives ["can", "'", "t"] versus one-shot
  ["can't"]. The last-segment-only optimization is unsound for word boundaries.
- Action: request approval for a separate svelte-motion fix before redispatch.
  Keep core default semantics and exact-text assertions unchanged; no trimming,
  manual DOM whitespace removal or weakened test. Helper fix stays in current
  approved scope. No source authored by parent; no final PASS/commit/PR.

## 2026-10-07 — PLAN AMENDED — resume after upstream publication

- Snapshot: 04a7afe (previous provisional implementation checkpoint; not a PASS).
- Operator authorized using published Motion 2.0.1-0 to move the feature forward.
- Rebaseline remaining work to checkpoint; authorize scoped root/docs dependency
  updates, retain all correctness/gate requirements, and require whitespace verification.
- Preserve stash after comparing checkpoint contents; isolated worktree avoids
  unrelated issue-372 checkout. Word segmentation can' → can't remains a required fix.
- Next: Sol execution of remaining Steps 2–5; parent independently verifies.

- Plan-only amendment commit was attempted through normal hooks; Trunk rejected
  lint defects in checkpoint source (complexity, duplicate import, unused props).
  Parent corrected the log's code-span formatting; source repair is delegated
  to Sol before retrying the amendment commit. No hooks bypassed.

## 2026-10-07 — ON TRACK — prerequisite lint repair checkpoint

- Snapshot: 5519119; only three authorized source files changed.
- Full diff read: extracted adoption/projection helpers preserve logic; Motion
  consumer snippet alias corrects shadowing instead of suppressing a lint rule.
- Parent reproduced 125 focused non-preset tests passing and pnpm check with
  zero errors, three existing warnings; normal commit hooks passed Trunk and types.
- Known Motion 1.2.1 whitespace and incremental word segmentation remain unresolved.
- Plan rebaselined to 5519119 for resumed implementation. This is not a feature PASS.

## 2026-10-07 — BLOCKED — final verification

- Snapshot: c731780 (Sol implementation and corrections, normal hooks passed).
- Full remaining diff read; within authorized API/presets/docs/packaging scope.
- Parent reproduced full unit/coverage, docs types, tree-shaking/no-peer proofs,
  preset exact-text tests, interactive docs controls. No core Motion dependency.
- Parent full E2E failed Chromium heading-metadata.test.ts:4: expected
  scenario=parse-heading-heavy-done, observed idle (5-second assertion timeout).
- All 615 cases were scheduled; no streaming-text failure in log. Runner
  termination waited on orphaned preview child; parent terminated its own
  port-4260 preview after test execution to finish cleanup. Exit 1 retained.
- Executor two full runs also failed unchanged issue-192/heading tests. Baseline
  attribution is unproved. Repeated-failure STOP honored; no further source edits.
- NO-PASS: obtain a clean full-suite run or diagnose the heading interaction
  against baseline under an approved scope before changing acceptance/status.

## 2026-10-07 — PLAN AMENDED — bounded readiness repairs

Operator asked to dig into the heading blocker. Report 009 reproduces lost
pre-hydration clicks and lazy-image src readiness on both baseline and feature
HEAD. Reviewed diagnostic scripts: route-module gate holds hydration while the
real SSR button accepts clicks; after onMount, exact 2,000 heading IDs pass.
Approve bounded benchmark readiness signal and E2E synchronization, plus awaited
exact image src assertion. Preserve original acceptance criteria and timeouts.
This addresses baseline test preconditions, not heading parser semantics.

## 2026-10-07 — ON TRACK — final PASS after readiness repair

- Snapshot: 10838d0; source repairs confined to approved benchmark/test files.
- Parent read full diff: readiness reflects onMount, controls disabled before
  mount, regression gates real route modules; all original heading IDs, image
  URL assertions and timeouts retained. No parser/feature changes.
- Normal source commit hooks pass. Parent final production build/publint pass.
- Parent full E2E: 620 passed (five projects), exit 0, no retries, 2.3 minutes.
- Prior parent 1,564 full unit tests/coverage remain valid: no library source
  changes after that run. Docs/types/bundle/no-peer/preview gates already passed.
- PASS report replaces previous NO-PASS; historical blocked checkpoints retained.
- No PR/push/merge. Own preview server stopped; batch ready for retirement.

## 2026-10-07 15:01 — ON TRACK — motion E2E corrective verification

- User rejected unstyled docs/fixture review and requested actual motion E2E.
  Corrective snapshots ea5a817 and95b3b98 add styled comparison and60 browser cases;
  reports011–013 preserve failed gates and recorder diagnosis.
- Round014 snapshot83c34ea: parent full diff read, normal hooks pass, assertions
  unchanged; one reusable Range prevents recorder-induced Safari activation stalls.
- Parent independently reproduced all60 motion cases passing, exit0,1.8m,
  allfive configured projects. Log /tmp/motion014-guard-e2e.log.
- Report014 is PASS for behavior/testing; user's subjective motion-quality
  concern remains open. Plain library defaults unchanged. Both review servers live.
- Action: record and commit guard evidence; no PR/push/merge requested.
