# Plan 011: Bound per-frame work to the open tail — measured prefix costs, single-owner rendering

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dea763..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/streaming-token-reuse.ts src/lib/utils/render-metadata.ts src/lib/SvelteMarkdown.svelte src/lib/Parser.svelte`
> Plans 007–010 are EXPECTED to have changed these. Re-read every excerpt
> below against live code; proceed only where the differences are those
> plans' changes.

## Status

- **Priority**: P1
- **Effort**: L
- **Risk**: HIGH (parser boundaries, component ownership, heading metadata)
- **Depends on**: 006 (prefix-scaling scenarios + attribution), 008 (semantic equality), 007/009/010 decided
- **Category**: perf
- **Planned at**: commit `7dea763`, 2026-09-28

## Why this matters

To beat Streamdown on mixed prose at one update per frame, our per-frame
cost must stop scaling with document length. Today several costs are
O(number of root tokens) or O(source length) on EVERY frame, even when the
tail window re-lexes only the open block:

1. `parseSource` copies the whole prefix: `[...this.prevTokens.slice(0, prefixCount), ...tailTokens]`
   (`incremental-parser.ts:~413`).
2. The divergence loop starts at index 0 and calls `isSameStableNode` on
   every prefix root (`:~601-612`). With the tail window, `newTokens[i] ===
prevTokens[i]` for `i < prefixCount` by construction; before Plan 008
   there was no same-object fast path, so each was a deep walk.
3. `reuseStableTokenArray` allocates and fills an N-length array
   (`streaming-token-reuse.ts:~140-170`).
4. `SvelteMarkdown.svelte` runs `parsed(tokens)` with the full array every
   pass (`:~594`; default no-op) and `footnoteMetadata` walks it when
   footnotes are on.
5. Append detection scans the source: `nextStr.startsWith(streamSourceBuffer)`
   (`SvelteMarkdown.svelte:~230`) and `source.startsWith(this.prevSource)`
   (`incremental-parser.ts:~318`) — O(source length) each, memcmp-fast but
   present.
6. The root `{#each tokens …}` in `Parser.svelte` re-diffs N keys and calls
   `getStableNodeKey` N times per frame.

Plan 006's `prefix-24kb/96kb/384kb` scenarios (identical 2 KB tail, growing
closed prefix) make these visible: bounded work shows as flat `avgWorkMs`
across the three; today it is expected to grow. This plan measures each
item, fixes the ones that are sound and measurable, and DESIGNS (does not
prescribe) the rendering change, because the obvious "two `{#each}` blocks"
split is unsound: each Svelte `{#each}` owns its own item map, so promoting a
closed block from a "tail" array to a "prefix" array destroys and recreates
its component (loses local state, focus, selection). Any rendering change
must keep every block under a single owner for its whole life.

## Current state

`src/lib/utils/incremental-parser.ts`:

```ts
// :~405-418 parseSource (tail-window branch)
const tailTokens = lexAndClean(source.slice(boundary.reparseOffset), this.options, false)
return {
    tokens: [...this.prevTokens.slice(0, boundary.prefixCount), ...tailTokens],
    tailTokens,
    usedTailWindow: true
}

// :~596-630 divergence loop
let divergeAt = 0
let divergeOffset = parseResult.usedTailWindow ? boundary.reparseOffset : 0
if (!referenceSensitive) {
    const minLen = Math.min(this.prevTokens.length, newTokens.length)
    while (divergeAt < minLen) {
        if (!isSameStableNode(this.prevTokens[divergeAt], newTokens[divergeAt])) break
        if (parseResult.usedTailWindow) {
            if (divergeOffset !== undefined && divergeAt >= boundary.prefixCount)
                divergeOffset += this.getTokenSourceLength(next)
        } else {
            /* accumulate from 0, null on html span mismatch */
        }
        divergeAt++
    }
}
```

`src/lib/SvelteMarkdown.svelte`: `applyStreamingSource` (~168–195),
`syncStreamingSourceFromProp` with `startsWith` (~226–245), `parsed` effect
(~592–595), `footnoteMetadata` derived (~578–588), `<Parser {tokens} …/>`.

`src/lib/Parser.svelte:~262-268` root each (single owner today — keep it
that way).

`src/lib/utils/render-metadata.ts`: `assignPreparedHeadingIds` (~372–395)
resets the slugger when `startIndex === 0` or the signature changed;
otherwise rewinds the undo log to `startIndex`. Any rendering redesign must
keep root indices global and the reset/rewind semantics intact.

Conventions: see Plan 006.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                                                     | Expected                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Typecheck     | `pnpm check`                                                                                                                                                                                | 0 errors                 |
| Focused tests | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/streaming-token-reuse.test.ts src/lib/SvelteMarkdown.issue-328.test.ts src/lib/utils/streaming-reuse-repro.test.ts` | pass                     |
| Full tests    | `pnpm test`                                                                                                                                                                                 | all pass, coverage ≥ 90% |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                                            | `✔ No issues`            |
| Attribution   | `STREAM_COMPARE_SCENARIO=prefix-384kb node scripts/stream-compare-attribute.mjs`                                                                                                            | bucket table + top-15    |
| Paired bench  | Plan 006/007 protocol on `prefix-24kb`, `prefix-96kb`, `prefix-384kb`, `prose-mixed`, `large-closed-block`                                                                                  | parity 0                 |

## Scope

**In scope**:

- `src/lib/utils/incremental-parser.ts` + tests
- `src/lib/utils/streaming-token-reuse.ts` + tests
- `src/lib/SvelteMarkdown.svelte`
- `src/lib/Parser.svelte` (root branch only, and only per the Step 5 design)
- `src/lib/utils/render-metadata.ts` + tests (only per the Step 5 design)
- `.agents/.plans/stream-vs-streamdown/evidence/011/`, `011-design.md` (create), batch `README.md`

**Out of scope**: the `parsed` callback CONTRACT (still the full array when a
consumer supplies one); non-root Parser branches; docs claims.

## Git workflow

- Branch: `perf/bounded-prefix-work` off `main` after 007–010.
- Commits per item: `perf(streaming): start divergence scan at the reused prefix boundary`, etc.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Measure the prefix-proportional costs

Run the attribution script and the paired bench (A/A control acceptable
here) for `prefix-24kb`, `prefix-96kb`, `prefix-384kb`. Additionally add a
dev-only counter set to the parser (guarded like `__svmParserCount`):
`__svmStreamStats = { comparedRoots, copiedRoots, keyEvaluations }` — increment
`comparedRoots` per `isSameStableNode` call in the divergence loop,
`copiedRoots` per element copied in `parseSource`/`reuseStableTokenArray`,
`keyEvaluations` per `getStableNodeKey` call. Record all three per frame at
each prefix size.

**Verify**: a table in `evidence/011/README.md` with `avgWorkMs`, the three
counters, and bucket shares at 24/96/384 KB. Today the counters must scale
with prefix size (that is the red state for Steps 2–4).

### Step 2: Start the divergence scan at the reused boundary (sound, O(1))

Red test in `incremental-parser.test.ts`: spy on `isSameStableNode` (export
it from the reuse module — it already is) and assert that for a tail-window
append on a 50-root document it is called at most (roots after
`prefixCount` + 1) times; today it is called ~50 times.

Fix: when `parseResult.usedTailWindow`, initialise `divergeAt = boundary.prefixCount`
and `divergeOffset = boundary.reparseOffset` and scan only from there (the
prefix objects are identical by construction). Keep the full scan for the
non-tail-window path. Update JSDoc.

**Verify**: red → green; all parser tests pass; `comparedRoots` in Step 1's
counter becomes flat across prefix sizes.

### Step 3: Avoid the prefix copy where a consumer does not need it

Red test: `copiedRoots` per frame is ~N today. Design constraint: consumers
receive `tokens` as one array (Parser root each, `parsed`, footnotes). Options
to evaluate (choose the one that measures best and keeps a single array):

- (a) Keep the copy but make it the ONLY copy: `reuseStableTokenArray` in
  prefix mode currently allocates a second N-array; when the parser already
  returned an array whose prefix objects are the previous ones (tail-window
  path), the component can skip its own copy and only merge the diverged
  root in place of a fresh array (one `slice()` of N is still O(N) — measure
  whether V8's memcpy makes this negligible at 384 KB ≈ 6,000 roots).
- (b) Persistent structure: keep `prevTokens` as the array the component
  renders and only ever append/replace the tail portion by building
  `next = prev.slice(0, prefixCount)` — same O(N) copy. Reject unless (a)
  measures badly.

Implement (a) unless Step 1 shows the copy is under 0.05 ms at 384 KB, in
which case record "not worth doing" and skip.

**Verify**: `copiedRoots` ≤ 1 copy per frame (or documented skip); parity 0.

### Step 4: Bounded source scans and callbacks

- `parsed`: only call when the consumer supplied a callback (`parsed !== defaultParsed`
  sentinel) — zero cost by default; contract unchanged when supplied.
- `startsWith` checks: replace the two full-string scans with a length check
  plus `startsWith` only when lengths differ by the appended chunk size…
  no: `startsWith` IS the correctness check. Measure first (Step 1
  attribution); at 384 KB a memcmp is ~20–40 µs. If it is under 0.1 ms per
  frame, record "not worth doing".

**Verify**: measurements recorded; default `parsed` no longer invoked
(`vi.spyOn` test: with no `parsed` prop, the internal default is not called
— or simply assert the effect is skipped via a counter).

### Step 5: Design the rendering side (single owner), then decide

Write `011-design.md` evaluating, with the Step 1 numbers for
`keyEvaluations` and the root-each share in the attribution:

- (a) Do nothing: if the root keyed each + N key evaluations cost under
  0.3 ms at 384 KB after Steps 2–4, stop here.
- (b) Chunked segments under ONE owner: render `{#each segments as segment (segment.id)}`
  where each segment is a stable object owning a fixed slice of roots; only
  the last segment's array changes per frame; segments never move roots
  between them (a closed root stays in the segment it was born in; a new
  segment starts when the current one reaches K roots). Ownership is stable
  because a root's component lives in the same inner `{#each}` for its whole
  life. Complexity: heading ids need global root indices
  (`rootIndexBase` per segment) and the undo-log rewind must work across
  segments; render keys are source offsets so they are unaffected.
- (c) Any alternative the executor finds, with the same ownership test.

For (b), the acceptance test is: a `TrackedParagraph` (fixture in
`src/lib/test/issues/issue-328/`) that is streamed while open, closes, and
then receives 100 further appends after it, is mounted exactly once and
never destroyed; duplicate headings across a segment boundary get
`intro`, `intro-1`, `intro-2` identical to a non-streaming render; a
`resetStream` and an options change re-render correctly.

Implement (b) only if the design doc shows the root-each cost is material
(≥ 0.5 ms per frame at 384 KB) — otherwise record the decision and stop.

**Verify**: `011-design.md` written with numbers and a decision; if
implemented, the ownership test and heading tests pass, parity 0.

### Step 6: Measure and gate

Paired bench on `prefix-24kb/96kb/384kb`, `prose-mixed`, `large-closed-block`;
attribution on `prefix-384kb`. Full gate: `pnpm check`, `trunk fmt && trunk check --fix`,
`pnpm test`. Archive under `evidence/011/`.

**Verify**: `avgWorkMs` at 384 KB within 15% of 24 KB (bounded work);
`comparedRoots`/`copiedRoots`/`keyEvaluations` flat across sizes (or
documented as negligible); parity 0; `prose-mixed` total work below
Streamdown's paired median.

## Test plan

- Red anchors: per-frame counters proportional to prefix size (Step 1), spy
  count on `isSameStableNode` (Step 2), copy count (Step 3), default
  `parsed` invocation (Step 4), ownership + heading tests if Step 5(b).
- Existing #291/#328 regression suites and heading parity remain green.
- Parity 0 on every bench run.

## Done criteria

- [ ] `evidence/011/README.md` has the before/after prefix-scaling table and counters
- [ ] Step 2 landed: divergence scan starts at `prefixCount` on the tail-window path (test asserts bounded `isSameStableNode` calls)
- [ ] Steps 3–4: implemented or explicitly recorded as "not worth doing" with the measured cost
- [ ] `011-design.md` exists with a decision on the rendering side; if implemented, ownership and heading tests pass
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0
- [ ] Paired bench: `prefix-384kb` avg work within 15% of `prefix-24kb`; `prose-mixed` below Streamdown; parity 0
- [ ] No files outside scope modified

## STOP conditions

- Plan 008 not merged (the fast path and semantic equality are prerequisites).
- Any design that moves a root between two `{#each}` owners — reject it; that
  remounts components (verified against `svelte/src/internal/client/dom/blocks/each.js`).
- Heading-id parity or any #291/#328 test fails.
- Parity mismatches > 0.
- Step 1 shows prefix-proportional work is already under 0.3 ms at 384 KB:
  record and mark the plan DONE with "measured negligible" for the remaining
  steps rather than implementing them.

## Maintenance notes

- The dev-only `__svmStreamStats` counters are the regression tripwire for
  O(N) work creeping back; consider asserting flatness in a unit test over
  two document sizes.
- If segments (5b) are implemented, document the segment size constant and
  the global-root-index rule next to the heading undo log.
