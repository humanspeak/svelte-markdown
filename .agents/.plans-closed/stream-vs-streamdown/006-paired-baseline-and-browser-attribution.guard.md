# Guard log — 006 paired-baseline-and-browser-attribution

## Checkpoint 1 — 2026-09-28 05:52 — BLOCKED (STOP condition fired, correctly)

e2f05da · executor (opus, worktree) completed Steps 1–2 and stopped at the plan's STOP condition "Parity check reports mismatches on `main` for any scenario". Steps 3–5 not started (scenario groundwork present but unexercised; no attribution script; no archived baseline). Diff applied to `perf/stream-bench-flush-timing` and snapshot-committed; evidence (step-1 log, two Node repro scripts + logs) copied to `evidence/006/`.

- Worktree base: harness created the worktree from `main` (`307b548`), which lacks the batch tip; executor `git reset --hard d63ccfb` (clean tree) to obtain the plan's base — reasonable, reported, no scope impact.
- Scope: only `scripts/stream-compare-bench.mjs` and `src/routes/test/stream-compare/+page.svelte` changed plus the evidence folder; `src/lib/` untouched (`git status`). No plan/README/guard edits, no commits.
- Reproduced by executor in Node against `dist/` (repro scripts in evidence; guard re-ran neither yet — runs pending after the 008 fix lands):
    1. `citations`: stale link `href` while a definition URL streams — `[62].tokens[7].href streamed "ht" · fresh "https://example.com/source/38"`; same defect as 008's amended Step 2b (`appendIntroducesMatch` ignores appends that extend an already-matching definition line).
    2. `prose-mixed`: a nested list item becomes its own top-level list when a 32-char chunk boundary falls after `"  - Nested 0.a\n "` — streamed `list,space,list` vs fresh `list`; the split sits in the reused prefix and is never repaired (31/31 checks mismatched). Root cause (guard reading of `incremental-parser.ts` `getNextTailWindowBoundary`/`isStableAtSourceEnd`): when the last token is a `space` token, the boundary treats the preceding block as closed, but a list is not closed by trailing whitespace or even a blank line (a blank line inside a list makes it loose and continues it). Not covered by any plan in the batch.
- Step 1 paired run: structure verified (alternating order, paired delta line); timings meaningless under load ~13 on 8 threads — executor said so.
- Classification: ON TRACK for the executor (STOP honored, nothing loosened). The two findings are pre-existing library correctness bugs surfaced by the new detector — exactly what Step 2 exists for.
- Action: reported to operator with a decision: (a) fix first — 008 Step 2b (dispatched) covers finding 1; finding 2 needs a new plan (proposed 013: tail-window boundary must not close a list/blockquote when the following token is `space` without a real block separator; parity tests at every chunk boundary of the prose corpus) — then resume 006 at Step 3; or (b) resume 006 recording the mismatches as known failures. Guard recommends (a); the plan forbids (b)'s comparator loosening but not recording.

## Checkpoint 2 — 2026-09-28 07:25 — PLAN AMENDED (work ON TRACK)

770f983 · resumed executor (opus, in-tree) completed Steps 1–5; parity 0 on all ten scenarios in both paired suites; attribution archived. Snapshot-committed.

- Guard reproduced: `pnpm test` 160/1176 green (98.5% lines), `pnpm check` 0 errors, `trunk check` clean on the three harness files; `git show --stat 770f983 -- src/lib` empty (no library changes); one fresh `citations` run against a new production build → `parityMismatches 0/31`, `pageErrors []`, paired delta line printed, DOM projection reported (1 difference: Streamdown renders no reference-style links — documented, not silenced).
- Attribution headline (pre-clamp): "JS outside the flush" dominates every scenario except `long-code-fence` (style/layout 58%); top self-time functions include the `$state` proxy `get` in every scenario (8–15%), `{#each}` update/reconcile, and `areRecordsSemanticallyEqual` (14.6% on `long-list`). Direct evidence for Plan 007's hypothesis and for Plan 011's prefix-scaling concern (avg work/frame 3.9 → 12.9 → 74.0 ms at 24/96/384 KB prefix).
- Metric defect found by the executor and confirmed by guard reading `measureFrame`: overlapping windows are double-counted on over-budget frames (18.7% of `long-list` total). Classification: PLAN DEFECT (measurement method), not drift — the executor kept the metric fixed and reported it. Action: Step 2b added (clamp window start to previous window end, re-run suites + attribution, keep pre-clamp files). Fix-dispatch (opus, fresh, in-tree).
- Streamdown renders 0 links on `citations` vs our 258: the cross-renderer comparison there is not like-for-like; note for the docs claims at batch close.

## Checkpoint 3 — 2026-09-28 08:10 — ON TRACK (final: PASS)

be3b3d7 · Step 2b executor (opus, in-tree) clamped overlapping frame windows, re-ran both paired suites and attribution, archived pre-clamp capture, rewrote evidence README. Snapshot-committed.

- Guard reproduced: `pnpm test` 160/1176 green; `pnpm check` 0 errors; `trunk check` clean on the three harness files; `git log e2f05da..HEAD -- src/lib` shows only 008/013 commits. Cross-checked `paired-run-1.json` against the report: totals, deltas, parity (0 in all 5 runs of all 10 scenarios), over-budget counts and `overlapClampedMs` match to the decimal.
- Diff read (`+page.svelte:517-575`): `WindowClock` per run; frame window starts at `max(rAF timestamp, previous window end)`; sync windows update the clock; trace measure aligned. Sound; under-budget scenarios show clamp ≈ 0, `long-list` 2,576/2,714 ms clamped (both renderers affected: theirs 1,421/1,526).
- Corrected baseline: ours ahead only on `prose-mixed-4x` (1.35×) and `large-closed-block` (1.23×); behind on `prose-mixed` (1.14–1.20×), `long-list` (1.40–1.43×), `long-code-fence` (1.81–1.88×), `citations` (2.40–2.43×), `prefix-*` (1.4–1.5×). Attribution: JS outside the flush 56–67% everywhere except `long-code-fence` (style/layout 59%).
- Action: README row → DONE; batch README gains the corrected baseline and attribution tables; Plan 007 dispatched next (depends on 006).
