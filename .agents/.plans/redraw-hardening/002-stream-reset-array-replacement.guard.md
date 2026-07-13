# Guard log — 002 stream-reset-array-replacement

## Checkpoint 1 — 2026-07-13 14:53 — ON TRACK

045232b · final close-out — full review of the executor's complete run (dispatched by operator, Opus 4.8, isolated worktree)

- Pre-dispatch drift check clean: `git diff --stat eed2e08..HEAD -- src/lib/SvelteMarkdown.svelte` empty despite main moving to v1.8.0 (shiki, #361) since planning; the three mutation sites sat exactly at the plan's lines 259/301/463.
- Diff is surgical and in-scope only: three `streamTokens.length = 0` → `streamTokens = []` swaps, the optional one-line addition to the #291 comment block (`SvelteMarkdown.svelte:181`), new `src/lib/SvelteMarkdown.stream-reset.test.ts` (2 characterization tests), README row 002 → DONE. No plan-file or guard-file edits.
- Step-2 ordering honored: executor ran both characterization tests against unchanged source first (2 passed) before touching `SvelteMarkdown.svelte` — no #291-class bug latent in reset-to-empty.
- Step-1 coverage audit checks out: imperative `resetStream('')` already covered by `SvelteMarkdown.streaming-html.test.ts` ("resetStream after an HTML-heavy stream clears the DOM"); prop-driven `source: ''` while streaming was a genuine gap, now covered.
- Done criteria all reproduced by guard (not taken from the executor's report): grep exit 1 (no matches), `pnpm check` exit 0, `pnpm test` exit 0 (145 files / 960 tests, coverage 96.13/90.44/96.29/97.69), named test file 2/2 passed, `git status` clean post-snapshot.
- Minor in-spirit deviation, judged acceptable: executor reworded the new test's docstring to avoid the literal string `streamTokens.length`, keeping the done-criterion grep clean; the grep's target is source mutation writes, and the docstring remains accurate.
- Action: PASS at final; PR opened via the `pr` skill (URL in close-out report). Reported to operator.

## Checkpoint 2 — 2026-07-13 15:54 — ON TRACK

1e8d5ab · operator-requested integration update — merged `origin/main` (now containing plan 001's harness, squash `eb0c749` / PR #365) into this branch

- Merge performed by guard at the operator's direction; only conflict was the batch README status table (both rows now DONE) — resolved in plan metadata only, no source touched by the merge beyond what main brought in.
- Combined gate re-run by guard on the merged tree: `pnpm test` exit 0 — 146 files / 965 tests passed (includes the 5 redraw-regression harness tests running against 002's reset refactor), coverage 96.13/90.44/96.29/97.69 unchanged.
- The reviewed snapshot `045232b` is untouched (merge, not rebase), so the close-out report's SHA remains valid; PR #364 updated by the push.
- Action: none needed — reported to operator.

## Checkpoint 3 — 2026-07-13 16:00 — ON TRACK

d5a5d97 · operator-requested /simplify pass on PR #364 (4 parallel reviewers: reuse, simplification, efficiency, altitude)

- Three angles returned clean or no-change recommendations: efficiency verified all three swapped sites are cold reset paths (one empty-array allocation per teardown); simplification recommended against extracting the 3x `clearStreamingParser(); streamTokens = []` blocks (the flow-controlling `return` can't move into a helper) and against test-assertion helpers at two call sites.
- One finding applied (altitude): the replace-never-shrink rule lived only inside `applyStreamingSource`, ~280 lines from the farthest reset site it governs — a 3-line invariant comment was added at the `streamTokens` declaration (`SvelteMarkdown.svelte:133`), the one anchor every writer sits under. Comment-only; verified with `pnpm check` (0 errors) and the 5-file streaming test set (130/130 passed).
- One observation deferred (reuse): the rAF-stub + `flushStreamingBatch` test boilerplate is now duplicated across 5 test files with no shared helper; extraction is a separate cross-file refactor, out of scope for this PR.
- Conduct note: this edit was authored by guard at the operator's explicit /simplify instruction — an operator-directed exception to guard's read-only rule, recorded here for the audit trail.
- Action: fix pushed to PR #364; reuse observation reported to operator for a possible follow-up plan.
