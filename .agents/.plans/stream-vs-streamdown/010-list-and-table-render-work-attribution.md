# Plan 010: Attribute and cut the per-frame render work of a long open list and table

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 8fd84a7..HEAD -- src/lib/Parser.svelte src/lib/utils/render-metadata.ts src/lib/utils/streaming-token-reuse.ts`
> Plans 008/009 may have changed the reuse util and added a dev counter to
> `Parser.svelte`. Re-read live code for every excerpt; proceed if the
> differences are only those; otherwise STOP.

> **Revision 2026-09-28 (guard pre-flight):** Plans 006, 007, 008, 009 and
> 013 have landed (tip `8fd84a7`). Facts that changed since the excerpts
> below: (1) `streamTokens` is `$state.raw` (007) — the deep-state proxy `get`
> trap is gone from the profiles, and `long-list` is ALREADY below Streamdown
> on total work (Plan 007 B: 5,854–6,046 ms vs Streamdown ~9,150 ms) with 3–19
> over-budget frames of 754, p95 11.9–14.5 ms; (2) the dev-only
> `window.__svmParserUpdateCount` exists (`Parser.svelte:197-215`, added by 009) — reuse it, do not add another; (3) the comparator is semantic (008),
> so `areRecordsSemanticallyEqual` is what the `long-list` profile now shows
> at ~6% self time (was 14.9%); (4) line numbers drifted: list branches at
> `Parser.svelte:~414` and `:~443`, table body cells at `:~353`.
> Re-target the Step 5 gate accordingly: `long-list` must reach ZERO
> over-budget frames (batch contract) and keep its lead; `long-table`
> (new in Step 1) gets its own before/after and must not be behind
> Streamdown. Use the same-build A/B recipe (`STREAM_COMPARE_URL_A/_B`,
> A = git worktree at the pre-change tip; see `evidence/007/README.md`).
> Baseline re-stamped to `8fd84a7`.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: 006 (attribution), 007 (decided), 009 Step 1 (update counter)
- **Category**: perf
- **Planned at**: commit `8fd84a7`, 2026-09-28 (amended pre-flight; original `7dea763`)

## Why this matters

A 200-item bullet list that stays open (no blank line) is our worst absolute
scenario: 21.6–22.2 ms per frame, 407–418 of 754 frames over budget, vs
Streamdown 14.5–15.4 ms (evidence:
`.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`). Only ~6 ms
of ours is the parser flush (and ~1.3 ms of that is the unavoidable re-lex of
the open list); the rest is Svelte derived/DOM work and layout whose split is
unknown. The batch goal requires this scenario under budget on every frame,
which means removing more than half of the current work.

Hypotheses to test, in order of cheapness (none is established yet; the
adversarial review showed the first cannot be observed the way the
superseded plan proposed, because child token props override parent props in
the spread):

- H1 — `sanitizedRest` churn: the list branch of `Parser.svelte` passes
  `parserRest` (= `sanitizedRest` minus `items`, which still contains the
  list's growing `raw`/`text`) to `dispatch(itemToken, parserRest)`; every
  child `<Parser {...restProps} {...token}>` gets a NEW spread object each
  frame even when every resulting prop VALUE is unchanged (token fields
  override), and its own `sanitizedRest` `$derived.by` returns a new object,
  so its descendants' spreads re-run. Cost = O(all inline tokens in the list)
  object allocations + derived re-runs per frame.
- H2 — table cells: `cellRest` includes the table's `raw`, `header`, `rows`;
  same mechanism plus the `align` lookup per cell.
- H3 — render-metadata re-walk: `assignSequentialSourceKeys` re-keys every
  child of the diverged list every frame (Node: reuse + metadata adds
  0.65 ms/frame on this corpus vs 0.08 on prose).
- H4 — layout: one `<ul>` with 200 `<li>` where only the last changes should
  lay out incrementally; verify via the attribution buckets rather than
  assume.

Deliverable: measured attribution for each hypothesis, and fixes only for the
ones that measurably matter, verified by the paired protocol.

## Current state

`src/lib/Parser.svelte`:

```svelte
<!-- :~197-260 dispatch snippet -->
<Parser {...restProps} {...token} {...headingIdProps} {...footnoteProps} {renderers} ... />

<!-- :~392-401 ordered list body (unordered twin at ~421-430) -->
{@const { items: _items, ...parserRest } = sanitizedRest}
{#each items as item, index (renderMetadata.getStableNodeKey(item, index))}
    ...
    {#each item.tokens ?? [] as itemToken, k (renderMetadata.getStableNodeKey(itemToken, k))}
        {@render dispatch(itemToken, parserRest)}

<!-- :~331-336 table body cells -->
{@const { align: _align, ...cellRest } = sanitizedRest}
{#each cells.tokens ?? [] as cellToken, index (renderMetadata.getStableNodeKey(cellToken, index))}
    {@render dispatch(cellToken, cellRest)}

<!-- :~262-268 root and :~495-500 generic block already strip text/raw(/tokens) before dispatch -->
```

`sanitizedRest` (`:~172-193`) is `$derived.by` returning `rest` itself for
non-link/image/html types (same object as the `rest` prop — but `rest` is a
new object whenever the parent spread changes).

Inline text fast path (`:~155-172`): when the user has not overridden `text`/
`rawtext`, text tokens are rendered inline WITHOUT a Parser instance. Custom
`text` renderers disable this fast path, so measurements must use DEFAULT
renderers to reflect the production path.

`src/lib/utils/render-metadata.ts:~200-222` `assignSequentialSourceKeys` and
`:~272-295` `assignHeadingIds` walk the diverged root's whole subtree every
pass. `reuseStableNode` (`streaming-token-reuse.ts`) merges reused items into
a new list object each frame (the list `raw` changed), so item objects are
reused but the list object is new.

Dev-only counters: `window.__svmParserCount`, `__svmParserByType` (existing),
`__svmParserUpdateCount` (added by Plan 009 Step 1; if 009 has not landed, add
it here with the same guard).

Conventions: see Plan 006.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                         | Expected                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Typecheck     | `pnpm check`                                                                                                                    | 0 errors                 |
| Focused tests | `pnpm vitest run src/lib/SvelteMarkdown.test.ts src/lib/SvelteMarkdown.issue-328.test.ts src/lib/utils/render-metadata.test.ts` | pass                     |
| Full tests    | `pnpm test`                                                                                                                     | all pass, coverage ≥ 90% |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                | `✔ No issues`            |
| Attribution   | `STREAM_COMPARE_SCENARIO=long-list node scripts/stream-compare-attribute.mjs`                                                   | bucket table             |
| Paired bench  | Plan 006/007 protocol, `STREAM_COMPARE_SCENARIO=long-list` (and a table scenario, Step 1)                                       | parity 0                 |

## Scope

**In scope**:

- `src/lib/Parser.svelte`
- `src/lib/utils/render-metadata.ts` + test (only if H3 is confirmed)
- `src/routes/test/stream-compare/+page.svelte` (add `long-table` scenario)
- `src/lib/SvelteMarkdown.issue-328.test.ts`, `src/lib/test/issues/issue-328/` (fixtures)
- `.agents/.plans/stream-vs-streamdown/evidence/010/`, batch `README.md`

**Out of scope**: what list-item/table-cell RENDERERS and snippets receive
(`<ListItemComponent {...item}>`, `<renderers.tablecell {...cellRest}>`,
`cellSnippet`/`listSnippet` argument objects) — public contracts;
`incremental-parser.ts`; `SvelteMarkdown.svelte`.

## Git workflow

- Work on `perf/stream-bench-flush-timing` (batch branch); the reviewer commits.
- Commits per confirmed fix: `perf(render): <what was cut> (H<n>)`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a `long-table` scenario and take attribution

In the bench page add `long-table`: a single GFM table with ~150 rows × 4
cells of short inline content (bold, code span, link), streamed at 32
chars/frame (the table stays open until the trailing blank line). Run the
attribution script for `long-list` and `long-table` on `main`. Record bucket
shares (flush / JS outside flush / style+layout / paint / GC) and the top-15
self-time functions.

**Verify**: both attribution tables archived under `evidence/010/`; the
"JS outside flush" bucket's top functions are named (this decides H1/H2 vs
H3 vs H4).

### Step 2: Red tests for H1 and H2 using a renderer-update observable

Using DEFAULT renderers (to keep the inline text fast path), stream an open
list of 30 items via `writeChunk`; after the list is present, read and reset
`window.__svmParserUpdateCount`; append 8 characters to the last item; flush;
assert `__svmParserUpdateCount` ≤ (Parser instances under the LAST item + 2).
Expect it to FAIL today with a count proportional to all items if H1 holds —
if it PASSES, H1 is refuted for the default path: record that and skip Step 3.
Repeat for a 20-row table appending to the last cell (H2).

**Verify**: each test's outcome recorded (red = hypothesis confirmed for the
production path).

### Step 3: Fix confirmed churn without changing renderer contracts

If H1 confirmed: in both list branches, compute the child rest props ONCE per
list token identity and without volatile fields — e.g. `{@const childRest = pickChildRest(sanitizedRest)}`
where `pickChildRest` (module-level helper in `<script module>`) strips
`items`, `raw`, `text`, `tokens`, `type`, and memoizes by the `sanitizedRest`
object in a `WeakMap`. Pass `childRest` to `dispatch` only (the
`<ListItemComponent {...item}>` and snippet arguments are untouched). If H2
confirmed: same for table body/header cells (strip `raw`, `text`, `header`,
`rows`, `tokens`, `type`) with a dedicated `cellChildRest`.

**Verify**: Step 2 tests PASS; `pnpm vitest run src/lib/SvelteMarkdown.test.ts`
(covers custom listitem/tablecell renderers and snippet overrides) still green.

### Step 4: H3 — metadata re-walk of reused children (only if attribution names it)

If `assignSequentialSourceKeys`/`assignHeadingIds` appear in the top-15 for
`long-list`: in `render-metadata.ts`, when walking the diverged root's
children, skip descending into a child whose object identity is unchanged
from the previous pass AND whose computed key equals its stored key (both
conditions; identity alone is not enough because offsets can shift when an
earlier sibling grows — though in an open list only the LAST item grows, an
inserted sibling changes later offsets). Track "has heading descendant" per
node in a `WeakMap` so heading-id rewinds still visit subtrees that contain
headings. Red test first in `render-metadata.test.ts`: count `renderKeys.set`
calls (expose a test-only stats hook) for a 200-item list with 199 reused
items → today ~all children, after ≤ children of the changed item.

**Verify**: red → green; all `render-metadata.test.ts` and heading-id parity
tests (`SvelteMarkdown.issue-328.test.ts`, `tests/heading-metadata.test.ts` if
present) pass.

### Step 5: Measure and gate

Paired bench `long-list` and `long-table` (A = main, B = branch), 5
iterations, twice; attribution on B. `pnpm check`, `trunk fmt && trunk check --fix`,
`pnpm test`. Archive under `evidence/010/README.md`; update batch README.

**Verify**: parity 0; ours `totalWorkMsMedian` below Streamdown's paired
median on `long-list`; `framesOverBudget` reduced by at least half vs A.
Report the remaining per-frame budget breakdown — Plan 011 takes the rest.

## Test plan

- Red anchors: update-count tests per hypothesis (H1 list, H2 table) with
  default renderers; key-write count for H3.
- Contract guards: existing custom-renderer/snippet tests in
  `SvelteMarkdown.test.ts` unchanged.
- Parity = 0 in every bench run.

## Done criteria

- [ ] Attribution tables for `long-list`/`long-table` archived (before and after)
- [ ] Each hypothesis H1–H4 marked confirmed/refuted in `evidence/010/README.md` with the observable used
- [ ] For each confirmed hypothesis, a red→green test exists
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0
- [ ] Paired bench: parity 0; `long-list` total work below Streamdown's; over-budget frames at least halved
- [ ] No files outside scope modified

## STOP conditions

- Step 2 refutes H1 and H2 AND attribution puts most time in style/layout
  (H4): report; a DOM-shape change would be a new plan, not this one.
- Any custom-renderer or snippet-override test fails after Step 3.
- Heading-id parity fails after Step 4.
- Parity mismatches > 0.

## Maintenance notes

- Keep the "strip volatile parent fields before `dispatch`" rule consistent
  across root, generic block, list, and table branches; a reviewer should
  check any new branch.
- The dev-only update counter is the cheapest regression tripwire for prop
  churn; consider a unit test that bounds it on the prose corpus.
