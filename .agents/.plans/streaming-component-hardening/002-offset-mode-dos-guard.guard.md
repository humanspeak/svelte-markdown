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
