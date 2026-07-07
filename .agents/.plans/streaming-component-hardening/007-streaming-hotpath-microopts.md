# Plan 007: Streaming hot-path micro-optimizations (single-pass reuse array + de-duplicated `startsWith`)

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat 939f154..HEAD -- src/lib/utils/streaming-token-reuse.ts src/lib/utils/incremental-parser.ts`
> On any change, compare "Current state" excerpts to live code; mismatch ⇒ STOP.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (if plan 011 lands first and removes
  `reuseStableStreamingTokens`, skip Part A — see STOP conditions)
- **Category**: perf
- **Planned at**: commit `939f154`, 2026-07-07
- **Absorbs GitHub issue**: #332 residual (the reference-syntax caching from #332
  already shipped; only the double `startsWith` remains). Close #332 when this
  lands.

## Why this matters

Two small, behavior-preserving wins on the ~30-flush/sec streaming hot path:

- **Part A** — `reuseStableStreamingTokens` rebuilds a full-length array via
  `slice(0,reuseCount).concat(slice(reuseCount))` every flush; for the common
  "only the last token diverged" case that materializes an N-length array plus
  two slices each flush (O(N) per flush, O(N²) over a growing stream). A single
  preallocated fill removes the intermediates.
- **Part B** — `IncrementalParser.update()` computes
  `source.startsWith(this.prevSource)` once as `isAppendOnly`, but
  `canUseTailWindow` computes the identical full-length scan again. Thread the
  boolean in so the scan runs once per update.

Both are pure work-elimination; existing behavior and tests must be unchanged.
(The larger #332 asks — caching `hasAppendSensitiveReferenceSyntax(prevSource)` —
already shipped as `prevHasPotentialReferenceUse` / `prevHasReferenceDefinition`,
so this plan is only the leftover.)

## Current state

### Part A — `src/lib/utils/streaming-token-reuse.ts:136-160`

```ts
const reuseCount = Math.min(divergeAt, previousTokens.length, nextTokens.length)
let reusedTokens: Token[] | undefined =
    reuseCount > 0
        ? previousTokens.slice(0, reuseCount).concat(nextTokens.slice(reuseCount))
        : undefined
const tailIndex = reuseCount
if (tailIndex < previousTokens.length && tailIndex < nextTokens.length) {
    const tailToken = reuseStableNode(...)
    if (tailToken !== nextTokens[tailIndex]) {
        reusedTokens ??= nextTokens.slice()
        reusedTokens[tailIndex] = tailToken
    }
}
return reusedTokens ?? nextTokens
```

### Part B — `src/lib/utils/incremental-parser.ts`

`update()` computes it once, line 499:

```ts
const isAppendOnly = this.prevSource !== '' && source.startsWith(this.prevSource)
```

`canUseTailWindow` recomputes the same scan, line 342:

```ts
if (!source.startsWith(this.prevSource)) return false
```

`canUseTailWindow` is called from `parseSource` (line 365), which `update` calls
at line 508 passing `boundary` and `referenceInvalidatesTail`. The append-only
fact is available at the `update` call site and can be threaded down.

## Commands you will need

| Purpose   | Command                                                      | Expected on success |
| --------- | ------------------------------------------------------------ | ------------------- |
| Typecheck | `pnpm check`                                                 | exit 0, 0 errors    |
| Reuse     | `pnpm test:only src/lib/utils/streaming-token-reuse.test.ts` | all pass            |
| Parser    | `pnpm test:only src/lib/utils/incremental-parser.test.ts`    | all pass            |
| All unit  | `pnpm test:only`                                             | all pass            |
| Lint      | `pnpm lint`                                                  | exit 0              |

## Scope

**In scope**:

- `src/lib/utils/streaming-token-reuse.ts` — Part A.
- `src/lib/utils/incremental-parser.ts` — Part B (thread `isAppendOnly` into
  `canUseTailWindow` / `parseSource`).

**Out of scope**:

- The reuse _identity rule_ and the enumerated-key walk — that is plan 011.
- Any semantics change to tail-window eligibility — Part B only removes a
  duplicate scan; the decision must be identical.

## Git workflow

- Branch: `advisor/007-streaming-hotpath-microopts` (`--no-track origin/main`).
- Commit style: `perf(streaming): single-pass reuse array; dedupe startsWith scan`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1 (Part A): single-pass reuse array

Replace the `slice+concat` with a preallocated array filled in one pass:
`const result = new Array(nextTokens.length)`; copy `[0, reuseCount)` from
`previousTokens` and `[reuseCount, nextTokens.length)` from `nextTokens`, then
apply the existing `divergeAt` tail-node reuse into `result[tailIndex]`. Preserve
the existing early-return shape (return `nextTokens` unchanged when nothing is
reused) to avoid allocating when `reuseCount === 0` and the tail node is
unchanged — match current allocation-avoidance behavior. Keep the function's
signature and return semantics identical.

**Verify**: `pnpm test:only src/lib/utils/streaming-token-reuse.test.ts` → all
pass.

### Step 2 (Part B): thread `isAppendOnly` into `canUseTailWindow`

Add an `isAppend: boolean` parameter to `parseSource` and `canUseTailWindow`
(or read a precomputed field), and pass the `isAppendOnly` value from `update`
down so `canUseTailWindow` uses it instead of recomputing
`source.startsWith(this.prevSource)`. Keep the `this.prevSource === '' ||
this.prevTokens.length === 0` guard (that is not the same as the startsWith
check). The resulting tail-window decision must be identical to today.

**Verify**: `pnpm test:only src/lib/utils/incremental-parser.test.ts` → all pass.

### Step 3: Full suite

**Verify**: `pnpm check` → 0; `pnpm test:only` → all pass; `pnpm lint` → 0.

## Test plan

- No behavior change ⇒ rely on the existing
  `streaming-token-reuse.test.ts` and `incremental-parser.test.ts` suites as the
  equivalence guard. Optionally add a micro-assertion that `startsWith` is called
  once per `update` (spy on `String.prototype.startsWith` is brittle — prefer
  not to; a comment noting the invariant is enough).
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0.
- [ ] `pnpm test:only` exits 0; no test expectations changed.
- [ ] `reuseStableStreamingTokens` no longer uses `.slice(...).concat(...)`
      (grep shows the single-pass fill).
- [ ] `canUseTailWindow` no longer contains `source.startsWith(this.prevSource)`
      (the append fact is passed in).
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 007 is updated; issue #332 noted as
      resolved-pending-merge.

## STOP conditions

- Either excerpt doesn't match live code (drift).
- Plan 011 has already landed and removed `reuseStableStreamingTokens` /
  `canReuse` — then Part A is moot; do only Part B and note it.
- Any existing test expectation would have to change to make this green — that
  means you altered behavior; revert and report.

## Maintenance notes

- If plan 011 later folds reuse into `IncrementalParser.update()`, Part A's
  function may be deleted entirely — that is fine; this plan just makes it cheaper
  in the interim.
- Reviewer should confirm Part B did not weaken the tail-window guard (the
  `prevSource === ''` / empty-tokens checks must remain).
