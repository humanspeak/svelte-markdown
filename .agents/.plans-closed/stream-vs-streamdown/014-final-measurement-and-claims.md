# Plan 014: Final paired measurement, acceptance-contract check, and corrected public claims

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README.
>
> **Drift check (run first)**:
> `git diff --stat 35bb92a..HEAD -- src/lib docs/src/lib/compare-data.ts .competitive-intel/config.json README.md`
> The only expected difference is Plan 012's outcome in `src/lib/renderers/Code.svelte`
> (kept or reverted). Anything else: STOP.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (measurement + docs; one README section)
- **Depends on**: 006–013 closed (012 decided either way)
- **Category**: docs / measurement
- **Planned at**: commit `35bb92a`, 2026-09-28

## Why this matters

The batch set out to correct the published streaming claims and then earn
better ones. Plans 006–013 produced per-plan A/B evidence, but the public
claims in `docs/src/lib/compare-data.ts` still describe the 2026-09-27
sequential-suite measurement (pre-clamp metric, pre-fix library) and the
batch README's acceptance contract has never been checked in one place
against one final build. This plan takes the definitive measurement of the
final build against svelte-streamdown 4.2.0 with the paired, parity-checked,
clamped harness, records the acceptance-contract verdict per scenario, and
rewrites the public claims from those numbers — including the honest
caveats (citations are not like-for-like because Streamdown renders no
reference-style links; the bench forces a whole-document layout each frame
that both renderers pay). It also documents the additive public API from
Plan 011 as the repo's README rule requires.

## Current state

- Harness: `src/routes/test/stream-compare/+page.svelte` (ten scenarios
  plus `long-table` from 010), `scripts/stream-compare-bench.mjs` (paired
  mode default, `STREAM_COMPARE_URL_A/_B` A/B mode), `scripts/stream-compare-attribute.mjs`.
  Method and conventions: `.agents/.plans/stream-vs-streamdown/evidence/006/README.md`
  (clamped metric), `evidence/007/README.md` (A/B recipe, load discipline).
- Batch README: `.agents/.plans/stream-vs-streamdown/README.md` — "Goal and
  acceptance contract" section and the per-plan results; the "Paired
  baseline (Plan 006…)" table is the pre-optimization reference.
- Public claims: `docs/src/lib/compare-data.ts` rows `Measured Per-Frame
Streaming Work` (~line 98) and `Measured DOM Footprint (~24 KB)` (~104),
  `prosUs`/`consUs`/`consThem` bullets that cite 2026-09-27 numbers
  (`grep -n "2026-09-27" docs/src/lib/compare-data.ts`), and
  `.competitive-intel/config.json` `benchmarks[0].measures`.
- Superseded evidence README: `.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`
  (2026-09-27 sequential suites, un-clamped metric) — needs a "superseded
  by" note at the top, not deletion.
- Public API added by Plan 011 (exported from `src/lib/index.ts:118`):
  `IncrementalParser.update(source, appendsTo?)` (optional second argument:
  a string `source` is known to start with, letting the parser skip its own
  full-length append check) and `IncrementalUpdateResult.reusedPrefixCount`.
  `README.md` does not currently document `IncrementalParser` at all
  (`grep -n IncrementalParser README.md` → none); the `parsed` prop is
  documented at ~lines 1070–1088 (its default changed from a no-op function
  to `undefined`; observable behavior unchanged).
- Behavior note from Plan 010: child tokens of list items/table cells no
  longer receive the parent list/table's `raw`/`text`/… via rest props
  (renderer and snippet contracts unchanged).
- Conventions: Trunk for lint/format; conventional commits; the docs package
  has 19 pre-existing svelte-check errors unrelated to `compare-data.ts`
  (missing generated files) — do not try to fix them.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                                                | Expected                      |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Typecheck     | `pnpm check`                                                                                                                                                                           | 0 errors                      |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                                       | `✔ No issues`                 |
| Unit tests    | `pnpm test`                                                                                                                                                                            | all pass, coverage ≥ 90%      |
| Build preview | `pnpm build && pnpm preview --host 127.0.0.1 --port 4183 --strictPort`                                                                                                                 | serves `/test/stream-compare` |
| Final suites  | `STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > evidence/014/final-run-N.log` (N = 1, 2) | exit 0, parity 0              |
| Attribution   | `STREAM_COMPARE_URL=... STREAM_COMPARE_SCENARIO=<id> node scripts/stream-compare-attribute.mjs`                                                                                        | bucket table                  |
| Docs check    | `cd docs && pnpm check 2>&1 \| grep -c compare-data`                                                                                                                                   | `0`                           |

## Scope

**In scope**:

- `.agents/.plans/stream-vs-streamdown/evidence/014/` (create: logs, JSON, attribution, README)
- `docs/src/lib/compare-data.ts` (the streaming/DOM rows and the bullets that cite measurements)
- `.competitive-intel/config.json` (`benchmarks[0].measures` text only)
- `.agents/.plans-closed/stream-bench-frame-work/evidence/README.md` (superseded note at top)
- `README.md` (one new subsection under the streaming docs for `IncrementalParser.update(source, appendsTo?)` / `reusedPrefixCount`, and one sentence in the `parsed` docs that it is optional)

**Out of scope**: any `src/lib/` change; the harness; the batch README
(reviewer); version bumps/changelog files (release automation owns them).

## Git workflow

- Work on `perf/stream-bench-flush-timing`; the reviewer commits.
- Suggested commit split (reviewer): `perf(bench): final paired measurement`,
  `docs: streaming claims from the final paired measurement`.

## Steps

### Step 1: Final measurement of the final build

With load ≤ ~4 (record `uptime`), build the current tip, start the preview
on 4183, and run the full paired suite twice (all scenarios, 5 iterations,
1 warmup). Then run attribution for `prose-mixed`, `long-list`,
`long-code-fence`, `citations`, `prefix-384kb`. Archive everything under
`evidence/014/` with a README in the 006/007 style (environment, commands,
load, results table ours vs theirs with paired deltas, over-budget frames,
p95, parity, DOM projection differences, attribution).

**Verify**: both logs end with `=== JSON ===`; parity 0 on every scenario in
both suites; zero page errors.

### Step 2: Acceptance-contract verdict table

In `evidence/014/README.md`, add a table with one row per scenario and the
contract columns: parity 0 · ours total < theirs · ours over-budget frames
= 0 · ratio theirs ÷ ours (both suites). Add the bounded-work row:
`prefix-384kb` renderer work (flush + JS outside flush, from attribution)
vs `prefix-24kb`, AND total avg work vs 24 KB, stating which one the
contract should read (renderer work is flat; total includes the browser's
whole-document layout that both renderers pay). Mark each cell met/unmet.
Do not editorialize; the reviewer decides what the contract means.

**Verify**: table present; every number traceable to a file in `evidence/014/`.

### Step 3: Rewrite the public claims

In `docs/src/lib/compare-data.ts`, replace the `Measured Per-Frame Streaming
Work` row's `us`/`them`/`note`, the `Measured DOM Footprint` row's numbers if
they changed, and every `prosUs`/`consUs`/`consThem` bullet citing
2026-09-27 numbers, using ONLY Step 1 medians (cite both suites as ranges,
date 2026-09-28, svelte-streamdown 4.2.0, headless production Chromium,
paired alternating runs, clamped per-frame work metric, parity checked
against a fresh parse). Required caveats in the note: `citations` is not a
like-for-like comparison (Streamdown renders 0 reference-style links, ours
258); `long-code-fence` DOM differs only by Streamdown's per-line wrappers;
absolute milliseconds are machine-specific, ratios are the claim; the
`prefix-*` scenarios include a forced whole-document layout per frame that
both renderers pay. Where ours is still behind (if anywhere), say so in
`consUs` with the ratio. Keep the `Reproduce with pnpm perf:stream-compare`
sentence.

Update `.competitive-intel/config.json` `measures` to describe the paired,
parity-checked per-frame work metric and the scenario list.

Add a two-line "Superseded (2026-09-28)" note at the top of
`.agents/.plans-closed/stream-bench-frame-work/evidence/README.md` pointing
at `.agents/.plans/stream-vs-streamdown/evidence/006/README.md` (metric
correction) and `evidence/014/README.md` (final numbers).

**Verify**: `grep -n "2026-09-27" docs/src/lib/compare-data.ts` → only in
historical wording if any (none expected); `cd docs && pnpm check 2>&1 | grep -c compare-data` → `0`;
`trunk check --fix` clean.

### Step 4: README API notes

In `README.md`, next to the streaming/`writeChunk` documentation, add a short
subsection documenting the exported `IncrementalParser` surface used by
advanced consumers: `update(source, appendsTo?)` with the second argument's
meaning, and the result fields `tokens`, `divergeAt`, `divergeOffset`,
`reuseMode`, `reusedPrefixCount`, `usedTailWindow` (one line each). Add one
sentence to the `parsed` prop docs: it is optional and, when omitted, no
token snapshot is taken per update. Mention in the renderers section that
child tokens inside list items and table cells receive only their own token
fields (not the parent list/table's `raw`/`text`).

**Verify**: `grep -n "reusedPrefixCount\|appendsTo" README.md` → both present;
`trunk check --fix` clean (markdownlint applies).

### Step 5: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- No runtime change; no red-first test. Verification is the archived suites
  (parity 0), the docs typecheck for `compare-data.ts`, and markdownlint.

## Done criteria

- [ ] `evidence/014/` has two full paired suites (JSON + log), five attribution runs, and a README with the acceptance-contract table
- [ ] Parity 0 on every scenario in both suites (reviewer re-reads the JSON)
- [ ] `docs/src/lib/compare-data.ts` streaming claims cite only 2026-09-28 paired numbers with the required caveats; `.competitive-intel/config.json` `measures` updated
- [ ] Superseded note present in the closed evidence README
- [ ] `README.md` documents `update(source, appendsTo?)`, `reusedPrefixCount`, optional `parsed`, and the list/table child-props note
- [ ] `pnpm check` 0 errors; `pnpm test` green; `trunk check` clean; docs check has 0 `compare-data` errors
- [ ] No files outside scope modified

## STOP conditions

- Parity mismatches > 0 in either final suite (a regression slipped in; report the scenario and mismatch path).
- Any scenario where ours is worse than the Plan 006 clamped baseline by more than 5% (regression; report before writing claims).
- Load cannot be brought under ~4 within 30 minutes.

## Maintenance notes

- When svelte-streamdown publishes past 4.2.0, `measured_against` in
  `.competitive-intel/config.json` must move with a re-run of Step 1; the
  nightly job flags it.
- The acceptance-contract interpretation of "bounded work" (renderer work vs
  total including forced layout) is recorded in the batch README by the
  reviewer at close; future harness changes should keep both numbers visible.
