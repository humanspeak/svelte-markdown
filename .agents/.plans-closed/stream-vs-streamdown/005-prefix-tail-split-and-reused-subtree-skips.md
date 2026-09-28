# Plan 005: Make per-frame render work O(open block): split stable prefix from open tail, skip reused subtrees

> **SUPERSEDED (2026-09-28)** by the revised batch (plans 006–012) after
> [ADVERSARIAL-REVIEW.md](ADVERSARIAL-REVIEW.md). Do not execute. Kept for
> the reasoning and excerpts only.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dea763..HEAD -- src/lib/SvelteMarkdown.svelte src/lib/Parser.svelte src/lib/utils/render-metadata.ts src/lib/utils/streaming-token-reuse.ts`
> Plans 001–003 are EXPECTED to have changed these files. Re-read the live
> code for every excerpt below before starting; where this plan's excerpt
> differs only by those plans' changes, proceed; otherwise STOP.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: MED
- **Depends on**: 001, 002, 003 (land and re-bench first; this plan is
  gated on a measurement in Step 1)
- **Category**: perf
- **Planned at**: commit `7dea763`, 2026-09-27

## Why this matters

After Plans 001–003, the remaining per-frame cost that scales with DOCUMENT
length (not open-block length) has two known sources:

1. Every flush hands Svelte a new top-level array. The root `{#each tokens}`
   in `Parser.svelte` re-diffs all N root keys each frame even though only the
   last root changed. `getStableNodeKey` is called N times, and
   `reuseStableTokenArray` allocates and copies an N-length array. Growth
   ratio on `prose-mixed` is 1.5–1.9 (work at the end of a 24 KB stream vs the
   start), and Streamdown's is similar, so beating them by 2× on prose needs
   this to become O(1).
2. Inside a long open block (list, table, blockquote), `reuseStableNode`
   re-validates and deep-compares every child every frame
   (`isReusableStreamingNodeArray` recurses at each level before comparing),
   and `prepareTokensForRender` re-walks the whole diverged subtree assigning
   keys and heading ids, including children whose object identity was just
   reused and already hold correct WeakMap entries. In Node, reuse + metadata
   adds 0.65 ms per frame on the 200-item list vs 0.08 ms on prose.

This plan does both, in that order, each behind its own measurement gate.

Expected delta: `prose-mixed` `growthRatioMedian` 1.5–1.9 → ≤ 1.2 and
`totalWorkMsMedian` ≤ 2,600 (vs Streamdown 2,655–2,818); `long-list`
`libraryFlushMsMedian` −30% from its post-003 value.

## Current state

Re-read live code; excerpts are from `7dea763`.

`src/lib/SvelteMarkdown.svelte` — `streamTokens` (one array), `applyStreamingSource`
sets `streamRenderMetadataStartIndex/Offset`, the `tokens` derived calls
`renderMetadata.prepareTokensForRender(rawTokens, combinedOptions, { source, startIndex, startOffset })`,
`footnoteMetadata` derived walks `tokens`, and `$effect(() => parsed(tokens))`
hands the full array to the consumer. `<Parser {tokens} … />` at the bottom.

`src/lib/Parser.svelte:262-268` root each:

```svelte
{#if !type}
    {#if tokens}
        {@const { text: _text, raw: _raw, tokens: _tokens, ...parserRest } = rest}
        {#each tokens as token, index (renderMetadata.getStableNodeKey(token, index))}
            {@render dispatch(token, parserRest)}
        {/each}
```

`src/lib/utils/streaming-token-reuse.ts:10-17` — the recursive validator that
runs before every comparison:

```ts
const isReusableStreamingNodeArray = (value: unknown): value is ReusableStreamingNodeArray =>
    Array.isArray(value) &&
    value.every((item) =>
        Array.isArray(item) ? isReusableStreamingNodeArray(item) : isReusableStreamingNode(item)
    )
```

`src/lib/utils/render-metadata.ts:200-222` — `assignSequentialSourceKeys`
re-keys every child of the diverged root unconditionally (`setRenderKey(node, …)`
then `assignSourceKeysToChildren(node, nodeOffset)`); `assignHeadingIds`
(lines ~272–295) re-walks the same subtree.

`IncrementalParser.update()` already returns `divergeAt` (first changed root
index) and the parser's tail-window boundary (`prefixCount`) is the same
notion: roots before it are closed and byte-stable.

Conventions and commands: see Plan 001. Bench: `pnpm perf:stream-compare`
against a production preview on port 4173; read `growthRatioMedian`,
`totalWorkMsMedian`, `libraryFlushMsMedian` from the JSON tail.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                             | Expected                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Typecheck     | `pnpm check`                                                                                                                                                        | 0 errors                      |
| Full tests    | `pnpm test`                                                                                                                                                         | all pass, coverage ≥ 90%      |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                    | `✔ No issues`                 |
| Build preview | `pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                                                                              | serves `/test/stream-compare` |
| Bench         | `STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=3 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > /tmp/005-<label>.log` | exit 0                        |

## Scope

**In scope**:

- `src/lib/SvelteMarkdown.svelte`
- `src/lib/Parser.svelte` (root branch only)
- `src/lib/utils/streaming-token-reuse.ts` + its test
- `src/lib/utils/render-metadata.ts` + its test
- `src/lib/SvelteMarkdown.issue-328.test.ts`
- `README.md` ONLY if the `parsed` callback contract changes (it should not)
- `.agents/.plans/stream-vs-streamdown/README.md`

**Out of scope**:

- `incremental-parser.ts` — the parser already exposes what is needed.
- Non-root branches of `Parser.svelte` (lists/tables were handled in 003).
- Footnote metadata semantics (`footnote-render-metadata.ts`).

## Git workflow

- Branch: `perf/stream-prefix-tail-split` off `main` after 001–003 merged.
- Commits per part: `perf(streaming): render stable prefix and open tail separately`,
  `perf(streaming): skip reuse validation and metadata for reused subtrees`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Measurement gate

Bench `prose-mixed` and `long-list` on the current `main` (post-003). Record
`growthRatioMedian`, `totalWorkMsMedian`, `libraryFlushMsMedian`. If
`prose-mixed` `growthRatioMedian ≤ 1.2` already, Part A is not needed: skip to
Step 4 and note it in the README. If `long-list` `libraryFlushMsMedian` is
under 1,500 ms, Part B is not needed either: mark this plan REJECTED with the
numbers.

### Step 2 (Part A): Red test — the root each must not re-diff the prefix

Add to `src/lib/SvelteMarkdown.issue-328.test.ts`: render with a custom
`paragraph` renderer fixture that counts how many times its `$effect` reading
`text` runs (reuse `TrackedText` from Plan 003 or `TrackedParagraph` with an
added `onTextUpdate`). Stream 50 closed paragraphs, then append a 51st
character by character (five appends). Assert the first 50 paragraphs'
renderers received zero updates during the five appends. This is likely
GREEN already (keyed each + reused identity). If it is green, the red
observable for Part A is a key-function call count instead: spy on
`renderMetadata.getStableNodeKey` (expose a dev-only counter the same way
`Parser.svelte` exposes `window.__svmParserCount` under `import.meta.env.DEV`)
and assert it is called ≤ (tail length + small constant) per flush, not N.
Confirm it fails today with ~N calls per flush.

**Verify**: the chosen assertion FAILS with a count proportional to N.

### Step 3 (Part A): Split prefix and tail

In `src/lib/SvelteMarkdown.svelte`:

- Replace the single `streamTokens` with two `$state.raw` arrays:
  `streamPrefixTokens` (closed, byte-stable roots) and `streamTailTokens`
  (roots from the parser's `divergeAt`/tail boundary onward). On each flush in
  prefix mode: if the new stable-prefix length grew, append the newly closed
  roots to the prefix (REPLACE the array once — this happens only when a
  block closes); always replace the tail array. In tree/none modes rebuild
  both.
- Keep a derived `streamTokens = [...prefix, ...tail]` ONLY for consumers that
  need the whole list: `parsed(tokens)` and `footnoteMetadata`. Build it
  lazily inside those deriveds; do not feed it to `Parser`.
- `prepareTokensForRender` is called on the concatenation today. Call it
  twice instead: once for the prefix (only when the prefix array changes,
  full offsets from 0) and once for the tail with `startIndex 0` and
  `startOffset` = prefix source length. Heading-id continuity across the
  split relies on `render-metadata.ts`'s undo log keyed by root index; pass a
  `rootIndexBase` (prefix length) so tail root indices stay global. Add that
  optional field to `RenderPreparation` and thread it through
  `assignHeadingIds`/`prepareHeadingId`.
- `Parser.svelte` root branch: accept an optional `tailTokens` prop and render
  a second `{#each tailTokens as token, index (renderMetadata.getStableNodeKey(token, index))}`
  after the first. Only the top-level `SvelteMarkdown` passes it. Keep the
  `tokens` prop semantics for every nested use.

Constraints: the invariants from #291 (always replace arrays wholesale) and
#328 (no remounts on token splits; keys are source offsets) must hold. Run
`pnpm test` after each sub-change; `SvelteMarkdown.issue-328.test.ts`,
`streaming-reuse-repro.test.ts`, and `src/lib/test/redraw/**` (if present) are
the tripwires.

**Verify**: Step 2 assertion PASSES; `pnpm test` all green.

### Step 4 (Part B): Red test — reused subtrees are not re-validated or re-keyed

In `src/lib/utils/render-metadata.test.ts`, spy on the WeakMap `set` path
(refactor `setRenderKey` to be spy-able or count via a returned stats object
in test mode) and assert that preparing a diverged list root whose first 199
items are the SAME objects as the previous pass performs ≤ (changed items ×
their children) key writes, not the whole subtree. In
`streaming-token-reuse.test.ts`, assert `reuseStableNode` on a list with 200
reused items does not call the recursive validator per item (spy on an
exported-for-test `isReusableStreamingNodeArray`, or count via
`vi.spyOn(Array.prototype, 'every')` guarded to the call).

**Verify**: both assertions FAIL today with whole-subtree counts.

### Step 5 (Part B): Skip work for reused children

- `streaming-token-reuse.ts`: replace the deep `isReusableStreamingNodeArray`
  validation with a shallow check (`Array.isArray(value)`) at each level and
  let recursion handle nesting; keep the `Array.isArray(item)` branching in
  `reuseStableNodeArray`. Preserve every existing test.
- `render-metadata.ts`: in `assignSequentialSourceKeys`, if
  `renderKeys.get(node) === expectedKey` for a node that came from reuse (same
  object as the previous pass), skip `assignSourceKeysToChildren` for it. Do
  the same in `assignHeadingIds` only when the node contains no heading
  (track a per-node "has heading descendant" flag in a WeakMap when first
  walked) — heading ids must still be recomputed for reused subtrees whose
  root index moved (the undo log rewinds them).

**Verify**: Step 4 assertions PASS; `pnpm test` all green.

### Step 6: Full gate and bench

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`. Bench all
scenarios (no `STREAM_COMPARE_SCENARIO`), compare with the Step 1 baseline,
record in the README.

**Verify**: `prose-mixed` `growthRatioMedian ≤ 1.2`; `long-list`
`libraryFlushMsMedian` at least 30% below baseline; no scenario regressed by
more than 5%.

## Test plan

- Part A red anchor: key-function call count per flush proportional to N
  today, bounded by tail length after.
- Part B red anchors: key-write count and validator-call count on a reused
  list subtree.
- Existing streaming stability suites (`issue-328`, `streaming-reuse-repro`,
  heading-id parity tests) stay green — they are the correctness net for the
  prefix/tail split and heading rewind.
- `parsed(tokens)` still receives the full concatenated array (add one
  assertion in `SvelteMarkdown.test.ts` if not already covered).

## Done criteria

- [ ] `pnpm check` 0 errors; `pnpm test` exits 0 with the new tests passing
- [ ] `grep -n "tailTokens" src/lib/Parser.svelte src/lib/SvelteMarkdown.svelte` shows the prop defined and passed once
- [ ] Bench recorded in README: `prose-mixed growthRatioMedian ≤ 1.2`, `long-list libraryFlushMsMedian` −30% vs Step 1 baseline
- [ ] No files outside scope modified

## STOP conditions

- Step 1 shows the gates already met — stop and mark REJECTED/partial as
  described.
- Any heading-id parity test fails after Step 3: the undo-log root indexing
  across the prefix/tail split is wrong; do not special-case tests.
- Any `#291`/`#328` regression test fails (stale DOM after `</details>`
  collapse, remounts on token split).
- The `parsed` callback's contract would need to change.

## Maintenance notes

- After this lands, every flush touches only the tail array in the common
  case. A reviewer should verify that no code path mutates the prefix array
  in place and that the prefix is rebuilt in `tree`/`none` modes.
- If the parser ever reports a `divergeAt` inside the rendered prefix (it
  should not in prefix mode), the split must fall back to rebuilding both
  arrays; add an assertion in dev builds.
