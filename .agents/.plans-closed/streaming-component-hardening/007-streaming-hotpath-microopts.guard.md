# Guard log — 007 streaming-hotpath-microopts

## Checkpoint 1 — 2026-07-08 18:09 — ON TRACK (full implementation: Parts A + B, all criteria hold)

Base `20ce3aa` (merge-base with `main`, = branch HEAD before this snapshot) · branch `advisor/007-streaming-hotpath-microopts` · scope of this checkpoint: **both Part A (single-pass reuse array) and Part B (dedupe `startsWith`) implemented, plus README row 007 flip**. Snapshot committed via the `commit` skill as `d7addea` (`perf(streaming): single-pass reuse array; dedupe startsWith scan`). First checkpoint. The executor's entire contribution was uncommitted working-tree changes on a branch with no commits of its own — the snapshot commit is the whole diff.

**Drift check clean.** Plan's own check `git diff --stat 939f154..HEAD -- src/lib/utils/streaming-token-reuse.ts src/lib/utils/incremental-parser.ts` returns empty (source unchanged in the committed history since planning; the work was purely in the working tree). Both "Current state" excerpts still matched live code before the edit — Part A's `slice(0,reuseCount).concat(...)` and Part B's inline `const isAppendOnly = ...` / `if (!source.startsWith(this.prevSource)) return false` were present exactly as the plan quoted. No STOP condition tripped (plan 011 has not landed; `reuseStableStreamingTokens`/`canReuse` still live).

**Done criteria — all reproduced in-tree at `d7addea` (not trusted from a report):**

- **`pnpm check` → exit 0**, 0 errors (4 pre-existing `state_referenced_locally` warnings in `_UnsupportedHTML`/`Image`/`Parser`/`CustomList`, unrelated to this change). ✓
- **`pnpm test:only` → 145 files, 944 tests, all pass.** Targeted suites also run in isolation: `streaming-token-reuse.test.ts` + `incremental-parser.test.ts` → 49 passed. ✓
- **No test expectations changed.** `git status`/diff shows only the two source files + the batch README modified — zero test files touched. The existing suites stand as the equivalence guard, exactly as the plan's Test plan intends. ✓
- **`reuseStableStreamingTokens` no longer uses `.slice(...).concat(...)`.** `grep -n "slice(0, reuseCount)\|\.concat("` → none. Replaced by `new Array<Token>(nextTokens.length)` + two fill loops (`streaming-token-reuse.ts:144-154`). ✓
- **`canUseTailWindow` no longer contains `source.startsWith(this.prevSource)`.** It now branches on the passed-in `isAppendOnly` (`incremental-parser.ts:347`). ✓
- **No out-of-scope files modified.** Only the two in-scope source files. README edit is required by the Done criteria, not out of scope. ✓
- **README row 007 flipped TODO → DONE** and the #332 disposition rewritten to "Residual double `startsWith` handled by 007; resolved-pending-merge on `advisor/007-streaming-hotpath-microopts`." ✓
- **Lint green:** `trunk check` on both changed files → No issues. ✓

**Part A serves its `Why this matters` — no gaming.** The `slice+concat` intermediates are genuinely gone; the reused prefix (`[0,reuseCount)` from `previousTokens`, preserving Svelte component identity) and fresh tail (`[reuseCount,len)` from `nextTokens`) are filled in one pass into a single preallocated array (`streaming-token-reuse.ts:144-154`). The allocation-avoidance shape is preserved: `reusedTokens` stays `undefined` when `reuseCount === 0`, the tail-node reuse still `??= nextTokens.slice()` only when the tail node actually changed (`:163-166`), and the function still `return reusedTokens ?? nextTokens` (`:169`) — so the "nothing reused" path allocates nothing, identical to before. Signature and return semantics unchanged.

**Part B achieves "scan once per update" — verified on the hot path.** `update()` now computes the append fact once via the new `isAppendOnlyUpdate` helper (`incremental-parser.ts:272-273`) and threads it positionally into `parseSource(source, boundary, isAppendOnly, referenceInvalidatesTail)` (`:515-520`) → `canUseTailWindow(..., isAppendOnly, ...)` (`:372`). In the hot path `startsWith` runs exactly once: `appendAddsDefinition` uses `appendIntroducesMatch` directly (no `startsWith`), and both of `canUseTailWindow`'s default args are supplied so neither default is evaluated. Before this change the same path ran it twice (inline in `update` + inside `canUseTailWindow`). Semantics identical: the `this.prevSource === '' || this.prevTokens.length === 0` guard is retained (`:346`), and the standalone/default-arg path still computes the identical fact locally.

**Positional-arg trap checked and clear.** Part B inserts `isAppendOnly` in the _middle_ of both signatures — a stale positional third arg at any call site would silently bind a reference flag to `isAppendOnly`. Audited every caller: the sole production `canUseTailWindow` caller (`:372`) passes all four args in the new order; the sole `parseSource` caller (`:515`) is updated; all test callers (`incremental-parser.test.ts:211,268,392,411,430,449,468,487,507`) pass only `(source, boundary)` and rely on defaults. No stale positional third arg anywhere. The full suite passing (incl. the tail-window behavioral tests that assert `true`/`false` outcomes) confirms the decision is unchanged.

**Second residual `startsWith` at `incremental-parser.ts:291` is not drift.** It lives in `hasNewReferenceDefinition`, a _different_ helper on the reference-definition path, and is only reached via `appendedDefinitionInvalidatesTail`'s standalone/default-arg use — never the hot `update` path (which supplies `referenceInvalidatesTail` precomputed). The plan's Part B scoped its dedup to `canUseTailWindow` only; this scan pre-existed and is out of scope for 007. Not a regression, not a miss.

Verdict: **ON TRACK.** Both parts are pure, behavior-preserving work-elimination exactly as the plan intends — no test was weakened, no criterion gamed, no out-of-scope file touched, no STOP skipped. Every Done criterion reproduced in-tree at `d7addea`. The maintenance-note guard held: Part B did not weaken the tail-window guard (empty-`prevSource`/empty-tokens checks intact). Next gate is `guard 7 final` as the integration gate (re-run all Done criteria against the snapshot, full scope audit, then open the PR on PASS). No PR at this checkpoint — this is a `guard <plan>` run, not `final`.

## Checkpoint 2 — 2026-07-08 18:14 — ON TRACK (final close-out + integration gate — PASS)

Reviewed at `d7addea` (source snapshot; `e023855` = guard log) · branch `advisor/007-streaming-hotpath-microopts` · this is the `guard 7 final` gate. Tree already clean at entry — checkpoint 1 committed the work — so nothing new to snapshot; the final gate re-judges the committed snapshot rather than a shifting working tree.

**Every Done criterion re-run from scratch at the snapshot (not trusted from checkpoint 1):**

- `pnpm check` → exit 0, 0 errors (4 pre-existing unrelated `state_referenced_locally` warnings). ✓
- `pnpm test:only` → 145 files, 944 tests pass; no test file in the diff (`git diff --name-only origin/main...HEAD` = 2 source + README + this guard log). ✓
- `grep "slice(0, reuseCount)\|\.concat("` in `streaming-token-reuse.ts` → none. ✓
- `canUseTailWindow` (lines 340–360) contains no `startsWith` — branches on `isAppendOnly`. ✓
- `trunk fmt`/`trunk check` on the changed files → No issues; tree stayed clean after fmt (no formatting drift). ✓
- README row 007 → DONE, #332 disposition rewritten to resolved-pending-merge. ✓

**Behavioral equivalence re-verified at the diff level.** Part A: the two fill loops cover `[0,reuseCount)` (from `previousTokens`) and `[reuseCount, nextTokens.length)` (from `nextTokens`) — together exactly `[0, nextTokens.length)`, no holes in the `new Array`, and both indices provably in-bounds since `reuseCount = min(divergeAt, previousTokens.length, nextTokens.length)`. Result is byte-identical to the old `slice(0,n).concat(slice(n))`; the tail-node reuse and `return reusedTokens ?? nextTokens` are untouched. Part B: `isAppendOnlyUpdate` is character-identical to the old inline expression; the hot `update` path calls `startsWith` exactly once — confirmed `appendIntroducesMatch` uses `slice`/`lastIndexOf` (no `startsWith`), and both of `canUseTailWindow`'s default args are supplied at the call site so neither default is evaluated.

**Scope & conduct clean.** Drift check `git diff --stat 939f154..HEAD -- <in-scope source>` shows only this executor's two files — no foreign source drift. Plan `.md` untampered by the executor (the only commits touching it, `ff08177`/`e260af6`, are main-branch plan-authoring commits, not on this branch's contribution). No STOP condition tripped. No out-of-scope file.

- Action: **PASS.** Opened PR [#349](https://github.com/humanspeak/svelte-markdown/pull/349) via the `pr` skill for snapshot `d7addea`; close-out report written. Merging remains the operator's call. #332 can be closed when this merges.
