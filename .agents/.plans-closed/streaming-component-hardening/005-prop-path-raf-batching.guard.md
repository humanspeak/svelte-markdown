# Guard log — 005 prop-path-raf-batching

## Checkpoint 1 — 2026-07-08 — ON TRACK (red-phase: failing tests verified)

Base `970a016` (merge-base with `main`) · branch `advisor/005-prop-path-raf-batching` · scope of this checkpoint: **Step 1 + Step 3 tests only** (the red/failing phase). No source change yet — expected for TDD red phase. Snapshot committed via the `commit` skill as `57c82b2` (`test(streaming): add red tests for prop-path rAF batching (plan 005)`). First checkpoint.

Operator scope for this run: "checking that the red tests meet the criteria." Judged the tests as a contract, not the (not-yet-written) implementation.

**The four new tests fail — and fail on the batching assertion, not on setup/compile.** Reproduced in-tree with `pnpm test:only src/lib/SvelteMarkdown.test.ts` → `4 failed | 76 passed`. Failure sites verified individually:

- **T1 `batches append-only source prop updates into one parser update per frame`** (`SvelteMarkdown.test.ts:395`) — fails at `expect(lexSpy).toHaveBeenCalledTimes(0)` → **got 3** (`:413`). Three same-frame append-only prop rerenders (`'Hello '`→`'Hello W'`→`'Hello World'`) each lex synchronously today. This is precisely the "five parse+diff+render passes, four invisible" waste named in the plan's _Why this matters_. Also asserts post-flush `toHaveBeenCalledTimes(1)` + final text `'Hello World'`, so it can only go green with real batch-and-apply, not by suppressing lex.
- **T2 `non-append source prop updates cancel a pending append-only prop flush`** (`:418`) — fails at `expect(container.textContent).not.toContain('Invisible')` → got `'SeedInvisible'` (`:433`). Encodes the reset-wins race the plan flags as "where batching bugs hide" (Step 3a); asserts final state after flush too (`'Reset'`, no `'Invisible'`).
- **T3 `token-array source prop updates cancel a pending append-only prop flush`** (`:437`) — fails at `not.toContain('pending')` → got `'Seed pending'` (`:461`). Covers Step 3b (token-array switch cancels pending).
- **T4 `unmount cancels pending append-only source prop flushes`** (`:466`) — fails at `toHaveBeenCalledTimes(0)` → **got 1** (`:486`). Covers test-plan #4 (`$effect` cleanup cancels the pending flush).

**Not false-reds.** Each test's setup phase passes: initial render + `flushStreamingBatch()` yields exactly `1` lex and correct text before the batching assertions. That proves the harness plumbing the tests depend on is correctly wired — `flushStreamingBatch` (`:126`, fake-timer + stubbed rAF→`setTimeout(…,16)`), `parseAndCacheModule.lexAndClean` spy (`:9`), and `Token` (`:8`) all resolve. So the four failures isolate the missing batching behavior, nothing else. 76 pre-existing tests unaffected.

**Coverage vs plan.** The four tests map 1:1 onto the plan's Test plan (batch-once / reset-wins / token-array-cancel / unmount-cancel) and cover both assertable Done criteria (N-appends⇒one-lex; non-append not clobbered by stale flush). T1 asserts a _stronger_ contract than Step 1's minimum ("called once for the batch") by pinning 0-synchronous-then-1-after-flush — an improvement, not drift.

**Scope clean.** Only `src/lib/SvelteMarkdown.test.ts` modified (in scope). No source, no plan file, no README touched. Plan file untampered. README row 005 still `TODO` — correct: the README flip + `pnpm check`/lint gates are green-phase Done criteria, not due yet.

**Baseline note for the next (green) checkpoint — not a red-phase problem.** The plan's drift check (`git diff --stat 939f154..HEAD -- SvelteMarkdown.svelte`) shows the file changed since `Planned-at` (85 lines, from plans 003/004 landing). Per the batch README standing directive (README:13-19) `Planned at` is intentionally pinned at `939f154`, so a non-empty drift diff is expected and not a STOP here. The excerpts Step 2 edits still match live code semantically — `syncStreamingSourceFromProp` (`SvelteMarkdown.svelte:244`), `isAppendOnly` (`:261`), `applyStreamingSource(nextStr, !isAppendOnly)` (`:276`) — only line numbers shifted from the plan's `237-270`/`179-213` ranges. The executor should re-confirm the batching-helper excerpts (`scheduleAppendFlush`/`flushPendingAppendChunks`/`cancelScheduledAppendFlush`) at their new line numbers before wiring the shared `streamFlushHandle`, and honor the STOP condition if unifying the two schedulers gets racy.

Verdict: **ON TRACK.** The red tests are genuine, fail for the right reasons, and faithfully encode the plan's intent — a sound foundation for Step 2. Next gate is the green implementation checkpoint (re-run all Done criteria: `pnpm check`, full `pnpm test:only`, `trunk fmt && trunk check`, README row, #327 note), then `guard 5 final` as the integration gate. No PR at this checkpoint (not `final`; work is red by design).

## Checkpoint 2 — 2026-07-08 — ON TRACK (green-phase: Step 2+3 implemented, all criteria hold)

Base `970a016` (merge-base with `main`) · branch `advisor/005-prop-path-raf-batching` · Step 2 (batching) + Step 3 (reset/mode-switch correctness) implemented in `src/lib/SvelteMarkdown.svelte` + README row. Snapshot committed via the `commit` skill as `71d0a03` (`perf(streaming): batch prop-driven source through rAF scheduler`). Second checkpoint.

**Done criteria — all reproduced in-tree (not trusted from a report):**

- `pnpm check` → **0 errors** (4 warnings, all pre-existing/unrelated: `_UnsupportedHTML.svelte`, `Image.svelte`, `Parser.svelte`, `issue-195/CustomList.svelte`).
- `pnpm test:only` (full) → **940/940 pass, 145 files** (was 936; +4 new). No existing test broke — so no observable-ordering regression for a documented use case (STOP condition #3 not tripped).
- The four plan-005 tests pass: `batches append-only source prop updates into one parser update per frame`, `non-append… cancel a pending… flush`, `token-array… cancel…`, `unmount cancels…` (`SvelteMarkdown.test.ts:395/418/437/466`).
- `trunk fmt && trunk check` → **✔ No issues** (4 modified files).

**Went green by the source fix, not by weakening tests.** `git diff 57c82b2 HEAD -- SvelteMarkdown.test.ts` is **empty** — the test file is byte-identical to the red-phase commit. The four assertions that failed at checkpoint 1 (T1 `lexSpy` 0-then-1; T2/T3 pending content absent; T4 unmount cancels) now hold purely because `SvelteMarkdown.svelte` changed. This is the TDD proof the checkpoint exists to confirm: no gamed done-criteria.

**Implementation matches the plan's preferred design (`SvelteMarkdown.svelte`).** The executor took Step 2's recommended _single-flush-entry-point_ route rather than two overlapping schedulers, so the unification STOP condition (STOP #2) did not fire — and the result is deterministically testable under the fake-timer harness:

- Added `pendingStreamFullSource: string | null` (`:124`); `teardownStreamingBuffers` and the flush entry point clear it.
- Renamed the three helpers to stream-generic names (`cancelScheduledStreamFlush` / `flushPendingStreamChanges` / `scheduleStreamFlush`) and routed both append-buffer and full-source flushing through the **one existing** `streamFlushHandle` — no second rAF. `flushPendingStreamChanges` applies `pendingStreamFullSource` if set (clearing the append buffer), else falls back to the append-buffer commit path.
- `syncStreamingSourceFromProp` append-only branch now sets `pendingStreamFullSource = nextStr` + `scheduleStreamFlush()` and returns; non-append still runs `teardownStreamingBuffers()` (which now cancels the pending prop flush) → synchronous apply. Also tightened `isAppendOnly` with `nextStr.length > streamSourceBuffer.length` so an identical-length source isn't treated as an append — a correctness hardening within the append-only definition, not drift.

**Out-of-scope boundary respected.** Plan marks the imperative `writeChunk`/offset paths out of scope ("do not change their behavior"). The executor added only `if (pendingStreamFullSource !== null) flushPendingStreamChanges()` drain guards to `writeChunk` and `applyAppendChunk`, plus the mechanical rename. `pendingStreamFullSource` is set **only** by the prop-append path, so in imperative-only usage these guards are no-ops → imperative behavior is unchanged; they exist solely to keep prop→imperative mode switches correct. `applyOffsetChunk`'s body is untouched (`git diff 71d0a03~1 71d0a03` shows it only as a context line). In-spirit, not an out-of-scope edit.

**Scope clean.** Executor contribution touches `SvelteMarkdown.svelte` (in scope), `SvelteMarkdown.test.ts` (in scope), and `README.md` (required Done criterion) — plus this guard log (my own artifact). No out-of-scope source. Plan file **untampered** (`git diff main...HEAD -- 005-…md` empty). README row 005 flipped `TODO → DONE`; #327 disposition annotated `resolved-pending-merge on advisor/005-prop-path-raf-batching`.

**Baseline-drift note (carried from ckpt 1, still not a blocker).** `git diff --stat 939f154..HEAD -- SvelteMarkdown.svelte` = 142 lines (cumulative: plans 003/004 + this 61-line change). Per the batch README standing directive (README:13-19) `Planned at` stays pinned at `939f154`; the edit-target excerpts matched live code at ckpt 1 and the executor built on the correct helpers. Not a real drift.

Verdict: **ON TRACK.** Every Done criterion holds, reproduced in-tree; the implementation is faithful to _Why this matters_ (append-only prop growth now coalesces to one parse/frame) and to the plan's preferred unified-scheduler design; no STOP condition tripped; scope clean; plan untampered. The work appears merge-ready. Next and final gate: **`guard hardening 5 final`** — the strict close-out + integration gate (re-run all criteria, full scope audit, write the close-out report, and on PASS open the PR via the `pr` skill). No PR opened here (this is a step checkpoint, not `final`).

## Checkpoint 3 — 2026-07-08 — ON TRACK (post-review CR test-strengthening; PASS still stands)

Base `970a016` (merge-base with `main`) · branch `advisor/005-prop-path-raf-batching` · re-checkpoint after the `guard final` PASS (close-out report `68f9cae`; note the `final` pass wrote the report but did not append a log entry, so this is the log's third checkpoint) and PR #346, to account for **one post-review commit** the close-out report predates. Tree already clean — nothing to snapshot; the commit under review is `d35be43` (`test(streaming): assert zero lex on token-array cancellation (CR #346)`), authored in response to a single CodeRabbit nitpick and already pushed to #346.

**What changed and why.** CodeRabbit (ASSERTIVE profile, self-tagged `nitpick / 🔵 Trivial / 💤 Low value`) suggested the token-array cancellation test (T3) assert `lexAndClean` call count directly, for parity with T1/T4, rather than inferring cancellation only from rendered text. `d35be43` does exactly that.

**Additive, not a weakening — verified line-by-line (`git show d35be43`).** The diff keeps **every** prior assertion (`not.toContain('pending')` ×2, the `'Array source'` text checks) and adds: a `vi.spyOn(parseAndCacheModule, 'lexAndClean')`, a `lexSpy.mockClear()` after the initial flush, `expect(lexSpy).toHaveBeenCalledTimes(0)` after the token-array source supersedes the discarded `'Seed pending'` buffer, and a `try/finally` + `mockRestore()` wrapper matching the T1/T4 idiom in this file. Nothing was removed or relaxed.

**Not gamed — the new assertion is real and passes for the right reason.** After `mockClear`, no lex should occur: `'Seed pending'` schedules a batched flush (0 synchronous lex), and the token-array rerender hits the `Array.isArray` branch (`SvelteMarkdown.svelte:262-267`) which `teardownStreamingBuffers()` (cancels the pending flush + clears `pendingStreamFullSource`) then sets `streamTokens` directly — token arrays bypass `lexAndClean` entirely. So `0` is meaningful (it would be non-zero if the discarded buffer leaked a parse or the pending flush weren't cancelled), directly asserting Step 3b's intent instead of inferring it.

**Done criteria — all re-reproduced in-tree at `d35be43`:**

- `pnpm check` → **0 errors** (4 pre-existing/unrelated warnings).
- `pnpm test:only` (full) → **940/940 pass, 145 files** — count unchanged (T3 strengthened, not added/removed).
- `trunk fmt && trunk check` (test file) → **✔ No issues**.
- Four batching tests still pass individually (`SvelteMarkdown.test.ts` — batch-once / non-append / token-array / unmount).

**Scope clean, plan untampered.** `d35be43` touches only `src/lib/SvelteMarkdown.test.ts` (in scope). `git show d35be43 -- 005-…md` empty (plan untouched). No source-behavior change — `SvelteMarkdown.svelte` byte-identical to the reviewed snapshot `71d0a03`.

**Reconciliation with the close-out report (`68f9cae`).** The report's Spirit section cited "test file byte-identical to the red-phase commit (`git diff 57c82b2 HEAD` empty)" as evidence the tests weren't gamed — true for the **reviewed snapshot `71d0a03`**, which is what the report is stamped at (`Reviewed at 71d0a03`). `d35be43` now makes the test file differ from the red phase by this one **additive** assertion, so that specific byte-identical check no longer holds at HEAD. This does **not** invalidate the PASS: the report is a point-in-time close-out of `71d0a03`, the change is strictly strengthening, and the anti-gaming conclusion is reinforced (a spy asserting `0`), not undermined. The report is intentionally **not** rewritten (this is a step checkpoint, not a `final` re-run); this log entry is the durable record of the post-review delta. If a merger wants the report's evidence line to match HEAD exactly, a `guard hardening 5 final` re-run would overwrite it.

Verdict: **ON TRACK.** The post-review CR fix is a faithful, in-scope, additive test-strengthening; all Done criteria still hold at `d35be43`; no source behavior changed; plan untampered. The PASS from Checkpoint 3 stands and PR #346 remains merge-ready.
