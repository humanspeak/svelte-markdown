# Plan 002: Offset-mode streaming rejects unbounded gaps instead of throwing / allocating huge strings

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before the next step. If
> anything in "STOP conditions" occurs, stop and report — do not improvise. When
> done, update this plan's status row in
> `.agents/.plans/streaming-component-hardening/README.md`.
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- src/lib/SvelteMarkdown.svelte`
> If it changed since this plan was written, compare the "Current state"
> excerpts against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug (denial-of-service hardening)
- **Planned at**: commit `939f154`, 2026-07-07

## Why this matters

`writeChunk({ value, offset })` accepts any offset up to
`Number.MAX_SAFE_INTEGER`. `applyOffsetChunk` pads the gap between the current
buffer length and `offset` with `' '.repeat(offset - streamSourceBuffer.length)`.
A single offset chunk with a large offset (from a buggy or malicious upstream —
e.g. an LLM proxy emitting a wrong offset) makes `' '.repeat(gap)` allocate
hundreds of MB (memory DoS) or throw an uncaught `RangeError: Invalid string
length` (around 2^29 chars), crashing the streaming render with no `try/catch`
around it. Normal offset writes land at or near the buffer end and are
unaffected; only pathological gaps are rejected.

## Current state

- `src/lib/SvelteMarkdown.svelte` — main component; imperative streaming API.

`applyOffsetChunk`, `src/lib/SvelteMarkdown.svelte:306-316`:

```ts
const applyOffsetChunk = ({ value, offset }: StreamingOffsetChunk) => {
    const padded =
        offset > streamSourceBuffer.length
            ? streamSourceBuffer + ' '.repeat(offset - streamSourceBuffer.length)
            : streamSourceBuffer
    const prefix = padded.slice(0, offset)
    const suffix = padded.slice(offset + value.length)

    streamSourceBuffer = prefix + value + suffix
    applyStreamingSource(streamSourceBuffer)
}
```

Offset validation in `writeChunk`, `src/lib/SvelteMarkdown.svelte:344-349`:

```ts
if (!Number.isSafeInteger(chunk.offset) || chunk.offset < 0) {
    warnStreaming(
        'Invalid offset chunk passed to writeChunk(); offset must be a non-negative safe integer.'
    )
    return
}
```

The existing convention for a rejected chunk: call `warnStreaming(...)` (which
does `console.warn('[svelte-markdown] ' + message)`) and `return` without
mutating state. Follow that convention for the new guard — do **not** throw.

Existing streaming tests that exercise offset mode and the `warnStreaming` path
live in `src/lib/SvelteMarkdown.test.ts` (search for `writeChunk` and `offset`);
they render the component and call the exported `writeChunk` method on the
instance. Fake timers + a stubbed `requestAnimationFrame` are already set up in
that file (see the `flushStreamingBatch` helper near line 125).

## Commands you will need

| Purpose   | Command                                         | Expected on success |
| --------- | ----------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                    | exit 0, 0 errors    |
| One file  | `pnpm test:only src/lib/SvelteMarkdown.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                | all pass            |
| Lint      | `pnpm lint`                                     | exit 0              |

## Scope

**In scope**:

- `src/lib/SvelteMarkdown.svelte` — add a bound on the offset gap.
- `src/lib/SvelteMarkdown.test.ts` — add a test for the rejected-gap path.

**Out of scope**:

- The append-mode path (`applyAppendChunk`) — it has no unbounded allocation.
- Changing the offset-chunk object shape or the `Number.isSafeInteger` check —
  keep both; you are adding one more guard.

## Git workflow

- Branch: `advisor/002-offset-mode-dos-guard`
  (`git checkout -b advisor/002-offset-mode-dos-guard --no-track origin/main`).
- Commit style: conventional commits, e.g.
  `fix(streaming): bound offset-mode gap to prevent RangeError/DoS`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Define a maximum gap constant

Near the other streaming constants at `src/lib/SvelteMarkdown.svelte:82-83`
(`STREAM_BATCH_FALLBACK_MS`, `STREAM_BATCH_MAX_CHARS`), add a bound. A generous
but safe cap keeps legitimate sparse writes working while blocking pathological
ones. Suggested:

```ts
// Largest gap (in chars) an offset chunk may open beyond the current buffer.
// Padding beyond this is treated as a malformed chunk rather than allocating
// an arbitrarily large string (which risks RangeError / memory DoS).
const STREAM_MAX_OFFSET_GAP = 1_000_000
```

**Verify**: `pnpm check` → exit 0.

### Step 2: Reject over-large gaps in the offset validation

In `writeChunk`, extend the offset validation block (lines 344–349) so that an
offset opening a gap larger than `STREAM_MAX_OFFSET_GAP` beyond the current
buffer is warned and dropped — matching the existing invalid-chunk convention.
Put this check where `streamSourceBuffer` is in scope (it is, inside the
component). Target shape:

```ts
if (chunk.offset - streamSourceBuffer.length > STREAM_MAX_OFFSET_GAP) {
    warnStreaming(
        `offset chunk skipped: offset ${chunk.offset} is more than ` +
            `${STREAM_MAX_OFFSET_GAP} chars beyond the current buffer length ` +
            `(${streamSourceBuffer.length}).`
    )
    return
}
```

Place it after the `Number.isSafeInteger`/`< 0` check and after the
append-mode-active guard (so mode-mismatch still takes precedence and messaging
stays consistent). It must run **before** `applyOffsetChunk(chunk)` is called at
line 362.

**Verify**: `pnpm check` → exit 0.

### Step 3: Add a defensive clamp inside `applyOffsetChunk` (belt and suspenders)

Even with Step 2, keep `applyOffsetChunk` itself safe if ever called directly.
Leave its logic intact but ensure the padding length can never be negative or
absurd — since Step 2 guarantees the gap is ≤ `STREAM_MAX_OFFSET_GAP` for all
`writeChunk`-driven calls, no code change is strictly required here. Only add a
clamp if you find another caller of `applyOffsetChunk` that bypasses Step 2
(there is none at 939f154 — verify with
`grep -n "applyOffsetChunk" src/lib/SvelteMarkdown.svelte`). If the only caller
is `writeChunk`, skip modifying `applyOffsetChunk` and note that in your report.

**Verify**: `grep -n "applyOffsetChunk" src/lib/SvelteMarkdown.svelte` → only
the definition and the single call site inside `writeChunk`.

### Step 4: Test the rejected-gap path

Add a test in `src/lib/SvelteMarkdown.test.ts`:

- Render `SvelteMarkdown` with `streaming` enabled and a string source.
- Spy on `console.warn` (Vitest `vi.spyOn(console, 'warn')`).
- Call `writeChunk({ value: 'x', offset: 5_000_000 })` (a gap far over the cap,
  assuming an empty/short buffer).
- Assert `console.warn` was called with a message containing `offset chunk
skipped` and that the rendered output did **not** grow by ~5M chars (e.g. the
  container text length stays small).
- Add a companion positive test: a small in-range offset write (e.g. append at
  `offset === streamSourceBuffer.length`) still applies and renders — proving the
  guard didn't break normal offset streaming.

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.test.ts` → all pass.

## Test plan

- New tests in `src/lib/SvelteMarkdown.test.ts`: (1) over-cap offset is dropped
  with a warning and no huge allocation; (2) an in-range offset write still
  works. Model on existing `writeChunk`/offset tests in the same file.
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0.
- [ ] `pnpm test:only` exits 0; the two new offset tests pass.
- [ ] `grep -n "STREAM_MAX_OFFSET_GAP" src/lib/SvelteMarkdown.svelte` shows the
      constant and its use in the guard.
- [ ] A `writeChunk` with `offset` far beyond the buffer no longer allocates a
      giant string (asserted by test) and does not throw.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 002 is updated.

## STOP conditions

- `applyOffsetChunk` or the `writeChunk` offset validation no longer matches the
  excerpts (drift since 939f154).
- `applyOffsetChunk` has a caller other than `writeChunk` — reconsider where the
  guard belongs and report before proceeding.
- A legitimate existing offset test breaks with the cap at 1,000,000 — the cap
  may be too low for this project's intended use; report rather than silently
  raising it past what's safe.

## Maintenance notes

- If a real use case needs sparser offset writes than 1,000,000-char gaps,
  raise `STREAM_MAX_OFFSET_GAP` deliberately — but never remove the bound; the
  `' '.repeat` allocation is the hazard.
- Reviewer should confirm the guard runs before `applyOffsetChunk` and uses the
  same `warnStreaming` + early-`return` convention as sibling validations.
