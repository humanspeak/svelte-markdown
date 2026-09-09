# Guard log — 002 footnote correctness

## Checkpoint 1 — 2026-09-09 13:56 — ON TRACK

3b45ca4 · preflight and serial executor dispatch

- Plan 001 passed at reviewed source snapshot 415df2e; guard report and amended Plan 002 committed at 3b45ca4.
- Drift inspection found only expected README image paragraph; footnote/Parser/root runtime matches original baseline.
- Amendment reanchors Plan 002 at 415df2e and records companion pnpm limitation plus verified direct Vitest path.
- Thin forwarder owns foreground fresh Codex companion execution using /tmp/svelte-markdown-dispatch-002.txt.
- Executor owns allowlisted source/tests/README; guard owns plan status, snapshots, verification and reports.
- Operator's added T3 browser request is a separate Plan 003 after the two runtime fixes, avoiding scope expansion inside Plan 002.

## Checkpoint 2 — 2026-09-09 — correction required before snapshot

3b45ca4 + staged executor changes · snapshot hook rejected lint

- Executor reported 3 intended red failures / 27 passing before runtime edits, then 80 footnote and 100 streaming tests passed through direct Vitest.
- Source snapshot commit attempted through normal hook; hook refused one new Trunk issue. Guard reproduced it in FootnoteSection's ephemeral Set (prefer-svelte-reactivity).
- Guard pnpm check reproduced 24 errors: two implicit snippet-prop any parameters, shared custom-renderer fixture weak-type incompatibility repeated across render calls, and two Marked Token union assertions without narrowing.
- Entire runtime/test/README diff read; source stays within thirteen-file allowlist and preserves immutable metadata, ID semantics, boundaries and streaming identity. No behavioral defect established.
- Fix dispatch 1 carries complete diagnostics and four-file allowlist, preserving assertions. Guard does not author source or bypass hooks.
- Full coverage scheduling amended to two workers using Plan 001's reproduced environment evidence; thresholds and test timeout unchanged.

## Checkpoint 3 — 2026-09-09 14:18 — ON TRACK

57f144d · corrected source snapshot committed with passing hooks

- Executor fix 1 remained within its four-file allowlist. It added typed renderer fixtures/snippet props, runtime-backed token narrowing and a narrowly explained Trunk ignore for ephemeral scratch Set state. Assertions preserved.
- Normal pre-commit formatting, lint and svelte-check passed. Independent Trunk check passed (25 modified files); independent pnpm check found 0 errors / 3 existing warnings.
- Independent actual Marked CRLF probe preserved continued body, following paragraph and heading.
- Default focused run lost a worker after 72 passing assertions, with no assertion failure. Bounded-worker retry passed 5 files / 80 tests. Streaming guards with the same limit passed 4 files / 100 tests.
- Scheduling amendment extends the already-proven two-worker limit to these gates; test assertions, timeout and coverage thresholds unchanged.
- Full coverage/build now running on immutable snapshot. Plan remains IN PROGRESS until those gates pass.

## Checkpoint 4 — 2026-09-09 14:22 — ON TRACK / PASS

57f144d · full guard final

- All independent gates passed: 80 focused tests, 100 streaming guards, 154 files / 1,081 full-suite tests, Trunk, pnpm check, pnpm build including package/publint, git diff --check.
- Full coverage: 96.88% statements, 91.68% branches, 98.05% functions, 97.93% lines. Existing thresholds and timeout unchanged.
- Entire thirteen-file snapshot reviewed, including test assertions and typing correction. No cached-token mutation, global counters, generic keying changes, no-footnote full scan, dependency changes or unrelated source.
- Guard updates status to DONE, writes report and commits artifacts separately. Plan 003 is authorized by the operator's T3 request and preflighted at this snapshot.
