# Plan 005: Prop-driven streaming source coalesces same-frame updates through the rAF scheduler

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- src/lib/SvelteMarkdown.svelte`
> On any change, compare "Current state" excerpts to live code; mismatch ⇒ STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `939f154`, 2026-07-07
- **Absorbs GitHub issue**: #327 (close #327 when this lands)

## Why this matters

The imperative `writeChunk()` path has a rAF-coalesced pending buffer, but the
**prop-driven** path — the documented common case, where `source` grows on each
LLM token — runs `syncStreamingSourceFromProp` → `applyStreamingSource`
synchronously on every prop change. Five prop updates in one animation frame =
five parse+diff+render passes, four of them invisible. Routing prop-driven
appends through the same pending-buffer/rAF scheduler used by `writeChunk()`
collapses them to one parse per frame — the single biggest "less jumpy" win for
real streaming apps. This plan makes the append-only prop path batch through
`scheduleAppendFlush`, while keeping non-append prop changes (resets, shrink,
token-array sources) synchronous and correct.

## Current state

- `src/lib/SvelteMarkdown.svelte` — streaming orchestration.

The prop path today, `src/lib/SvelteMarkdown.svelte:237-270`:

```ts
const syncStreamingSourceFromProp = (nextSource: typeof source) => {
    lastSourceProp = nextSource
    if (Array.isArray(nextSource)) { /* token array: sync, unchanged */ ... return }
    const nextStr = nextSource as string
    const isAppendOnly =
        incrementalParser !== undefined &&
        streamSourceBuffer !== '' &&
        nextStr !== '' &&
        nextStr.startsWith(streamSourceBuffer)
    teardownStreamingBuffers()
    if (nextStr === '') { clearStreamingParser(); streamTokens.length = 0; return }
    streamSourceBuffer = nextStr
    applyStreamingSource(nextStr, !isAppendOnly)   // <-- synchronous, every prop change
}
```

The batching machinery already used by `writeChunk` (imperative append),
`src/lib/SvelteMarkdown.svelte:179-213, 295-304`:

- `pendingStreamAppendBuffer` — chars waiting to be flushed.
- `commitPendingAppendBuffer()` — moves pending → `streamSourceBuffer`.
- `flushPendingAppendChunks(forceNewParser?)` — cancels the scheduled flush,
  commits, and calls `applyStreamingSource(streamSourceBuffer, forceNewParser)`.
- `scheduleAppendFlush()` — schedules a flush on rAF (or `setTimeout` fallback).
- `applyAppendChunk(value)` — appends to `pendingStreamAppendBuffer`, flushes
  synchronously if `>= STREAM_BATCH_MAX_CHARS`, else schedules.

The `$effect` at `src/lib/SvelteMarkdown.svelte:377-414` calls
`syncStreamingSourceFromProp(source)` whenever `lastSourceProp !== source`.

**Key subtlety** — the prop path receives the **full accumulated source**
(`nextStr` is the whole document), while `applyAppendChunk` receives an
**incremental delta**. So you cannot feed `nextStr` straight into
`pendingStreamAppendBuffer` (which is concatenated onto `streamSourceBuffer`).
The append-only prop case must schedule a flush that applies the _latest full
source_, not accumulate deltas. Design accordingly (see Step 2).

## Commands you will need

| Purpose   | Command                                         | Expected on success |
| --------- | ----------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                    | exit 0, 0 errors    |
| Stream    | `pnpm test:only src/lib/SvelteMarkdown.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                | all pass            |
| Lint      | `pnpm lint`                                     | exit 0              |

## Scope

**In scope**:

- `src/lib/SvelteMarkdown.svelte` — `syncStreamingSourceFromProp` and a small
  amount of new scheduling glue.
- `src/lib/SvelteMarkdown.test.ts` — batching tests for the prop path.

**Out of scope**:

- The imperative `writeChunk`/offset paths — do not change their behavior.
- `STREAM_BATCH_MAX_CHARS` semantics — leaving the char-cap flush as-is is fine
  for this plan (raising/removing it is a separate optimization; see 007).
- Token-array (`Array.isArray`) source handling — keep it synchronous.

## Git workflow

- Branch: `advisor/005-prop-path-raf-batching` (`--no-track origin/main`).
- Commit style: `perf(streaming): batch prop-driven source through rAF scheduler`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a failing test proving prop updates aren't batched today

In `SvelteMarkdown.test.ts` (which already installs fake timers + a stubbed
`requestAnimationFrame` → `setTimeout(…,16)`; see the `flushStreamingBatch`
helper near line 125), add a test that:

- Renders `SvelteMarkdown` with `streaming` and an initial string `source`.
- Spies on `lexAndClean` (existing tests already do
  `vi.spyOn(parseAndCacheModule, 'lexAndClean')`).
- Re-renders (updates the `source` prop) several times synchronously within one
  frame, each time extending the previous string (append-only).
- Advances timers by one frame.
- Asserts `lexAndClean` was called **once** for the batch (not once per prop
  update).

Against current code this FAILS (one lex per prop update).

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.test.ts` → new test FAILS,
others PASS.

### Step 2: Route append-only prop updates through a scheduled full-source flush

Introduce a "pending full source" mechanism parallel to the pending append
buffer. Recommended minimal design:

- Add a module-local `let pendingStreamFullSource: string | null = null`.
- In `syncStreamingSourceFromProp`, for the **append-only** string case
  (`isAppendOnly === true`): instead of calling `applyStreamingSource`
  synchronously, set `pendingStreamFullSource = nextStr` and call a new
  `scheduleFullSourceFlush()` that uses the same rAF/`setTimeout` pattern as
  `scheduleAppendFlush` and, on fire, applies the latest pending full source:

    ```ts
    const flushPendingFullSource = () => {
        cancelScheduledAppendFlush()
        if (pendingStreamFullSource === null) return
        const next = pendingStreamFullSource
        pendingStreamFullSource = null
        streamSourceBuffer = next
        applyStreamingSource(next, false) // append-only ⇒ reuse parser
    }
    ```

- For the **non-append** cases (empty string, shrink, first source, or
  `!isAppendOnly`): keep the current synchronous behavior, but first cancel any
  pending full-source flush and clear `pendingStreamFullSource` so a stale
  scheduled flush cannot overwrite a reset. A later, longer append-only source
  simply replaces `pendingStreamFullSource` (last-write-wins within the frame),
  which is exactly the coalescing you want.
- Reuse the **existing** `streamFlushHandle` so append-mode (`writeChunk`) and
  prop-mode never schedule two competing rAFs. `cancelScheduledAppendFlush`
  already clears `streamFlushHandle`; make the full-source scheduler set/read the
  same handle. Ensure `flushPendingAppendChunks` and `flushPendingFullSource`
  don't both run stale state — simplest is a single flush entry point that
  applies whichever of `pendingStreamAppendBuffer` / `pendingStreamFullSource` is
  set. **If unifying them gets hairy, STOP and report** rather than shipping two
  overlapping schedulers.
- Update `teardownStreamingBuffers` to also reset `pendingStreamFullSource = null`.

**Verify**:

- `pnpm test:only src/lib/SvelteMarkdown.test.ts` → all pass, including Step 1.
- `pnpm test:only` → all pass.

### Step 3: Verify reset/mode-switch correctness

Add tests: (a) an append-only burst then a _shorter_ (non-append) source in the
same frame ends with the shorter source rendered (reset wins, no stale flush);
(b) switching `source` to a token array mid-stream cancels any pending flush and
renders the array. Confirm the `$effect` cleanup (`cancelScheduledAppendFlush`
at lines 371-375) still cancels everything on unmount.

**Verify**: `pnpm test:only` → all pass; `pnpm check` → exit 0; `pnpm lint` → 0.

## Test plan

- New tests in `SvelteMarkdown.test.ts`: (1) N same-frame append-only prop
  updates ⇒ one lex; (2) reset-wins-over-pending; (3) token-array switch cancels
  pending; (4) unmount cancels pending. Model on existing streaming/batch tests.
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0.
- [ ] `pnpm test:only` exits 0; the four new tests pass.
- [ ] N same-frame append-only prop updates trigger exactly one `lexAndClean`
      (asserted by test).
- [ ] A non-append source in the same frame is not clobbered by a stale pending
      flush (asserted by test).
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 005 is updated; issue #327 noted as
      resolved-pending-merge.

## STOP conditions

- `syncStreamingSourceFromProp` or the batching helpers don't match the excerpts
  (drift).
- Unifying the append-buffer and full-source schedulers under one
  `streamFlushHandle` produces races you cannot make deterministically testable —
  report the design problem instead of shipping two schedulers.
- Batching changes observable output ordering for a documented use case (e.g.
  `parsed` callback timing that a test depends on) — report before proceeding.

## Maintenance notes

- After this lands, a `parsed` callback fires once per frame for prop streaming
  instead of once per token; document that if any consumer relied on per-token
  callbacks.
- Reviewer should focus on the reset/mode-switch races (Step 3) — that is where
  batching bugs hide.
- Plan 007 may raise/remove `STREAM_BATCH_MAX_CHARS`; it composes with this plan
  but is independent.
