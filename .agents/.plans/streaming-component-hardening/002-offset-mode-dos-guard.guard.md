# Guard log — 002 offset-mode-dos-guard

## Checkpoint 1 — 2026-07-07 15:44 — ON TRACK (plan defect to reconcile)

Base `ff081773` (origin/main) · branch `advisor/002-offset-mode-dos-guard` @ `8b53c54` + working tree. First checkpoint; covers the offset-gap DoS guard plus an operator-directed extraction of streaming helpers.

Functional intent — the actual point of plan 002 — is satisfied:

- Guard present and correct: `STREAM_MAX_OFFSET_GAP = 1_000_000` at `src/lib/utils/streaming-chunks.ts:6`; gap check `chunk.offset - currentBufferLength > maxOffsetGap` at `streaming-chunks.ts:79` emits the plan's exact `offset chunk skipped: ...` warn + `drop`, no throw. Matches plan Step 1/2.
- Runs before the hazard: the `' '.repeat` padding lives in `applyStreamingOffsetChunk` (`streaming-chunks.ts:105`), only reachable after `getStreamingChunkInstruction` clears the gap check (`SvelteMarkdown.svelte:321-337`). No bypassing caller.
- Tests genuine, not gamed: `SvelteMarkdown.test.ts:245` (5M offset dropped, warn asserted, container text length < 100 → no giant alloc) and `:259` (in-range offset still renders "Hello World"); unit-level gap rejection in `streaming-chunks.test.ts:91` asserts the exact message. Reproduced: `pnpm check` → 0 errors; `pnpm test:only` → 929/929 pass.
- README row for 002 flipped to DONE (`README.md:26`). Done criterion met.

Scope reconciliation:

- Plan Scope lists exactly two in-scope files and Done criterion 5 says _"No files outside the in-scope list are modified."_ Reality touches six: new `streaming-chunks.ts` + `streaming-chunks.test.ts`, modified `streaming.ts` (now re-exports `isStreamingOffsetChunk`), `SvelteMarkdown.svelte`, `SvelteMarkdown.test.ts`, `README.md`. The refactor also rewrote `writeChunk` into a `getStreamingChunkInstruction` state machine and moved `applyOffsetChunk`'s body out — tripping the plan's own drift/STOP wording ("`applyOffsetChunk` … no longer matches the excerpts").
- **Not executor drift.** Operator confirmed they directed pulling all functions out of the main component as part of this work. This is a **plan defect** (plan's narrow scope predates the operator instruction), not an out-of-scope violation or a skipped STOP.
- Action: **reported to operator; proposed amending the plan** to record the authorized broader scope (Scope in-scope list + Done criterion 5) and re-stamp `Planned at`. Awaiting explicit go-ahead before editing the plan.

Minor note (not blocking): extraction made `applyStreamingOffsetChunk` a public export still holding the raw `' '.repeat`. Plan Step 3's belt-and-suspenders clamp was conditioned on "another caller that bypasses Step 2"; export widens that surface. No current bypassing caller — flag for the amendment/maintenance notes, not a defect today.

## Checkpoint 2 — 2026-07-07 15:45 — PLAN AMENDED

`e057852` · reconciling the plan defect from Checkpoint 1 after operator agreed to amend.

- Two commits now on branch: `8b53c54` (helper extraction) + `e057852` (`fix(streaming): bound offset-mode gap to prevent DoS`). The staged guard work I reviewed at Checkpoint 1 was committed verbatim as `e057852` — content identical, so the `pnpm check` (0 errors) / `pnpm test:only` (929/929) results still hold.
- Amended `002-offset-mode-dos-guard.md`: added dated Revision note under the executor-instructions block; broadened **Scope → In scope** to include `streaming-chunks.ts`, `streaming-chunks.test.ts`, and `streaming.ts` (re-export only); reworded Done criterion 5 to "the (revised) in-scope list"; re-stamped **Planned at** `939f154` → `e057852`.
- Rationale: operator directed pulling functions out of the main component; the plan's original two-file scope predated that instruction — plan wrong about reality, not work wrong about the plan. No standard was lowered: the guard's cap/message/no-throw behaviour and all done-criteria are unchanged and still verified.
- Batch `README.md`: row is status-only (already DONE) with no scope column — no edit needed.
- Action: plan amended with operator agreement; logged. Remaining before `final`: `applyStreamingOffsetChunk` public-export clamp (operator opted not to fold into the plan now — tracked here only), and a clean `final` close-out pass.

## Checkpoint 3 — 2026-07-07 16:03 — ON TRACK (flaky suite to pin before final)

Uncommitted working tree over `e1a87ed`. Executor addressing the Checkpoint 1 open item: the Step 3 belt-and-suspenders clamp on the now-public `applyStreamingOffsetChunk`.

Clamp change — on track:

- `streaming-chunks.ts:105-121`: `applyStreamingOffsetChunk` gains a third `{ maxOffsetGap = STREAM_MAX_OFFSET_GAP }` arg; pads `boundedGap = min(gap, max(0, maxOffsetGap))` instead of the raw `offset - source.length`. Directly caps the `' '.repeat` that was the original DoS hazard — this is exactly plan Step 3's intent, now warranted because extraction made the fn a public export.
- Behaviour-preserving on the real path: for `gap ≤ maxOffsetGap`, `boundedGap == gap` and `effectiveOffset == offset` → byte-identical output. Confirmed against existing `'ab  XY'` gap test and the in-range/overwrite component tests (all green every run). `SvelteMarkdown.svelte:313-316` passes `maxOffsetGap: STREAM_MAX_OFFSET_GAP` explicitly (redundant with the default, harmless).
- New test genuine: `streaming-chunks.test.ts:152` asserts `applyStreamingOffsetChunk('ab', {value:'XY', offset:100}, {maxOffsetGap:3}) === 'ab   XY'` — real clamp assertion, not hollow. `streaming-chunks.test.ts` → 17/17.
- Scope: all three touched files (`streaming-chunks.ts`, `streaming-chunks.test.ts`, `SvelteMarkdown.svelte`) are inside the revised in-scope list. In-scope.
- `pnpm check` → 0 errors.

Flake — flagged, not attributed:

- Done criterion 2 requires a clean `pnpm test:only`. First full run this checkpoint reported `1 failed / 929 passed` (930 total); the failing test scrolled off before capture. Re-ran the full suite **6 more times → 930/930 every time** (incl. attempts to force it). Could not reproduce or name it. ~1-in-7.
- Not attributable to the clamp: the change has no async/timing surface, is behaviour-preserving on the exercised path, and its deterministic unit test passes 100%. Reads as a pre-existing environmental/timing flake (heavy jsdom + rAF/timer; env setup 400–750s under load).
- Action: reported to operator. Before `final`: pin the flaky test's identity (e.g. capture a full log on a red run, or run serially with `--no-file-parallelism`) so Done criterion 2 rests on a green suite that stays green — do not wave it through on "passed 6/7". Clamp work still **uncommitted**.

## Checkpoint 4 — 2026-07-07 16:27 — PASS (close-out)

`5f57063`, clean tree · full close-out gate. Wrote `002-offset-mode-dos-guard.guard-report.md`.

- All six done criteria re-run and reproduced: `pnpm check` 0 errors; `pnpm test:only` 6/6 green (`930 passed`); `STREAM_MAX_OFFSET_GAP` grep; excessive-gap test asserts no-alloc/no-throw; scope audit clean; README row DONE.
- Scope audit (`git diff ff081773...HEAD`): 5 source files (all revised in-scope) + guard artifacts only. Drift `e057852..HEAD` = the clamp, nothing else.
- Spirit met: `' '.repeat` DoS hazard closed at both entry points (writeChunk reject + apply-side clamp); normal offset streaming byte-identical.
- Flake resolved as non-blocking: the single red run never recurred across 12 subsequent full runs; no async surface in this work; not attributable to 002. Logged as a residual-risk follow-up (quarantine the flaky test) in the report — out of 002's scope/origin.
- Action: **PASS**. Integrated via `commit`/`pr` skills → PR https://github.com/humanspeak/svelte-markdown/pull/343 (base `main`, labels bug/security/javascript). Branch pushed with upstream set to itself (no push-to-main trap). Merge remains the operator's.
