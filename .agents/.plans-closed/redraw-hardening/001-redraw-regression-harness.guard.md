# Guard log — 001 redraw-regression-harness

## Checkpoint 1 — 2026-07-13 14:59 — ON TRACK

fd3f8a5 · final close-out — full review of the executor's complete run (dispatched by operator, Opus 4.8, isolated worktree)

- Pre-dispatch drift check clean: `git diff --stat eed2e08..HEAD -- src/lib/Parser.svelte src/lib/SvelteMarkdown.svelte src/lib/SvelteMarkdown.stream-id.test.ts` empty despite main moving to v1.8.0 since planning.
- Contribution diff is exactly the in-scope list: new `src/lib/SvelteMarkdown.redraw-regression.test.ts` (167 lines, 5 tests) plus README row 001 → DONE. Zero source files touched; no plan-file or guard-file edits.
- Assertions read in full and match the plan without loosening: in-place tail growth delta asserted `toBe(0)` (line 88); new-block delta asserted `>=1 && <=3` with observed value recorded as `// current: 1` (lines 105-111); DOM identity via `toBe(h1)` / `toBe(firstP)` after two flushes (lines 137-138); non-streaming rerender preserves prefix identity with bounded delta (lines 160-165). Calibration test proves the DEV counter is live (line 68-69). All deltas measured from snapshots, never absolutes, per the counter's cumulative semantics.
- Done criteria reproduced by guard: targeted file 5/5 passed; `pnpm check` exit 0 (0 errors); `pnpm test` exit 0 (coverage 96.13/90.44/96.29/97.69, thresholds met); calibration `console.info` absent (0 console statements in file).
- Minor in-spirit deviations, judged acceptable: Step 3's new-block tripwire is a separate test with a fresh render rather than literally continuing Step 2's stream (the plan's own Test plan lists them as separate coverage items; the tripwire is equivalent); an unused `readParserByType` helper from the Step 1 scaffold was dropped after the calibration log was removed (would have been an unused-var lint error).
- Action: PASS at final; PR opened via the `pr` skill (URL in close-out report). Reported to operator.
