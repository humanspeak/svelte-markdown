# Plan 003: Stop spreading the parent's `raw`/`text` into list-item and table-cell children

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
> `git diff --stat 7dea763..HEAD -- src/lib/Parser.svelte`
> If the file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (run after 002 for attributable deltas)
- **Category**: perf
- **Planned at**: commit `7dea763`, 2026-09-27

## Why this matters

While a bullet list is still open (no blank line yet), every streamed chunk
grows the list token's `raw` string. In `src/lib/Parser.svelte`, the list
branch builds the rest-props handed to each list item's children as
`sanitizedRest` minus `items` only — so the list's `raw` (the whole list
source, up to 24 KB, changing every frame), `text`, `type`, `loose`, `ordered`
and `start` are spread into the `<Parser>` of every inline token of every
item. When `raw` changes, all ~200 items × their inline children receive new
props and re-run their `sanitizedRest` derived and spreads, even though the
items themselves were reused by identity. The root branch and the generic
block branch already strip `text`/`raw`/`tokens` before recursing; the list
and table branches do not.

Measured 2026-09-27 (evidence in
`.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`): the
`long-list` stream costs 21.6–22.2 ms per frame, of which only ~6 ms is the
parser flush; the remaining ~15 ms is Svelte prop propagation, re-render and
layout. Streamdown spends 14.5–15.4 ms on the same corpus. Removing the
per-frame prop churn on unchanged items is the cheapest available cut.

Expected delta on `long-list`: `totalWorkMsMedian` 16,317–16,758 → ≤ 11,000
(at or below Streamdown), `framesOverBudget` 407–418 → ≤ 250. `prose-mixed`
also has short lists and a table per section; expect a small gain there.

## Current state

`src/lib/Parser.svelte` — recursive token renderer. Relevant excerpts:

Root branch (already strips; lines ~262–268):

```svelte
{#if !type}
    {#if tokens}
        {@const { text: _text, raw: _raw, tokens: _tokens, ...parserRest } = rest}
        {#each tokens as token, index (renderMetadata.getStableNodeKey(token, index))}
            {@render dispatch(token, parserRest)}
        {/each}
    {/if}
```

Generic block branch (already strips; lines ~495–500):

```svelte
{#snippet renderChildren()}
    {#if tokens}
        {@const { text: _text, raw: _raw, ...parserRest } = sanitizedRest}
        {#each tokens as childToken, index (renderMetadata.getStableNodeKey(childToken, index))}
            {@render dispatch(childToken, parserRest)}
```

List branch — does NOT strip (ordered, lines ~392–401, and the unordered twin
at ~421–430):

```svelte
{#snippet orderedListContent()}
    {@const { items: _items, ...parserRest } = sanitizedRest}
    {@const items = (_items as Props[] | undefined) ?? []}
    {#each items as item, index (renderMetadata.getStableNodeKey(item, index))}
        ...
        {#snippet orderedItemContent()}
            {#each item.tokens ?? [] as itemToken, k (renderMetadata.getStableNodeKey(itemToken, k))}
                {@render dispatch(itemToken, parserRest)}
```

Table branch — body cells receive `cellRest` = `sanitizedRest` minus `align`
(lines ~331–336), which includes the table's `raw`, `header`, `rows`:

```svelte
{#each row ?? [] as cells, j (renderMetadata.getStableNodeKey(cells, j))}
    {@const { align: _align, ...cellRest } = sanitizedRest}
    {#snippet bodyCellContent()}
        {#each cells.tokens ?? [] as cellToken, index (renderMetadata.getStableNodeKey(cellToken, index))}
            {@render dispatch(cellToken, cellRest)}
```

Header cells already pass `{}` to `dispatch` (line ~287): `{@render dispatch(headerCellToken, {})}`.

The `dispatch` snippet (lines ~197–260) spreads `restProps` then `token` into
the child `<Parser {...restProps} {...token} …>`, so anything left in
`parserRest`/`cellRest` becomes a prop of every descendant renderer.

Note: `cellRest` is ALSO spread into `cellSnippet({... ...cellRest ...})` and
`<renderers.tablecell {...cellRest}>` for the cell itself. Keep what the cell
renderer receives unchanged; only the `dispatch(cellToken, …)` argument for
the cell's CHILDREN changes.

Conventions: Svelte 5 runes, `{@const}` destructuring with `_`-prefixed
discards (as above). Tests: Vitest + `@testing-library/svelte`, streaming
harness in `src/lib/test/streaming/harness.ts`. Fixtures for lifecycle
tracking live in `src/lib/test/issues/issue-328/` (e.g. `TrackedParagraph.svelte`,
`TrackedListItem.svelte`). Commit style: conventional commits.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                                                               | Expected                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Typecheck     | `pnpm check`                                                                                                                                                                                          | 0 errors                      |
| Unit tests    | `pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts src/lib/SvelteMarkdown.test.ts`                                                                                                             | all pass                      |
| Full tests    | `pnpm test`                                                                                                                                                                                           | all pass, coverage ≥ 90%      |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                                                      | `✔ No issues`                 |
| Build preview | `pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                                                                                                                | serves `/test/stream-compare` |
| Bench         | `STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=3 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=long-list pnpm perf:stream-compare > /tmp/003-<label>.log` | exit 0                        |

## Scope

**In scope**:

- `src/lib/Parser.svelte`
- `src/lib/test/issues/issue-328/TrackedText.svelte` (create — fixture)
- `src/lib/SvelteMarkdown.issue-328.test.ts`
- `.agents/.plans/stream-vs-streamdown/README.md` (status row)

**Out of scope**:

- What list-item and table-cell RENDERERS themselves receive (`<...ListItemComponent {...item}>`,
  `<renderers.tablecell {...cellRest}>`, the `cellSnippet`/`listSnippet`
  argument objects). Public renderer contracts; do not change.
- `src/lib/SvelteMarkdown.svelte`, `render-metadata.ts`, `streaming-token-reuse.ts`.
- `README.md` — no API change.

## Git workflow

- Branch: `perf/parser-child-rest-props` off `main`.
- Commit: `perf(render): stop spreading list and table raw into child renderers`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Write a failing test that observes the prop churn

Create `src/lib/test/issues/issue-328/TrackedText.svelte`, a `text` renderer
fixture modeled on `TrackedParagraph.svelte`: it accepts `text`, `raw`,
`children`, and an `onTextUpdate?: (text: string | undefined, raw: unknown) => void`
callback; it calls `onTextUpdate` from an `$effect` that reads BOTH `text` and
`raw` props, so it re-runs whenever either prop changes; it renders
`{@render children?.()}` (matching `src/lib/renderers/Text.svelte`).

In `src/lib/SvelteMarkdown.issue-328.test.ts`, add a test:

1. Render `<SvelteMarkdown source="" streaming renderers={{ text: TrackedText }} />`
   with `onTextUpdate` wired through `rest` props? — renderers receive rest
   props from `passThroughProps`, so pass `onTextUpdate` as a prop on
   `SvelteMarkdown` itself (unknown props pass through to renderers; check
   `getPassThroughProps` in `src/lib/utils/component-props.ts` if unsure).
2. `writeChunk('- first item\n- second item\n- third')`, flush.
3. Reset the update log.
4. `writeChunk(' item grows')`, flush (the list is still open).
5. Assert the update log contains NO entry whose `text` is `'first item'`
   or `'second item'` (their props must be unchanged), and at least one entry
   for the third item.

**Verify**: `pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts` → the
new test FAILS with entries for `'first item'`/`'second item'` present (the
list `raw` changed and was spread into them).

### Step 2: Strip parent token fields in the list branches

In both `orderedListContent` and `unorderedListContent`, change:

```svelte
{@const { items: _items, ...parserRest } = sanitizedRest}
```

to

```svelte
{@const { items: _items, raw: _raw, text: _text, tokens: _tokens, ...parserRest } = sanitizedRest}
```

Keep `items` extraction (`const items = (_items as Props[] | undefined) ?? []`).
Do not remove `ordered`/`start`/`loose` from `parserRest` in this plan (a
custom renderer could read them; changing that is a separate decision).

**Verify**: `pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts` → Step 1
test PASSES.

### Step 3: Do the same for table body cell children

Introduce a second destructure right after `cellRest` inside the body-cell
`{#each}`:

```svelte
{@const { align: _align, ...cellRest } = sanitizedRest}
{@const { raw: _raw, text: _text, header: _header, rows: _rows, ...cellChildRest } = cellRest}
```

and pass `cellChildRest` (not `cellRest`) to `dispatch(cellToken, …)`. Leave
`cellRest` for the `cellSnippet` and `<renderers.tablecell>` spreads.

Extend the Step 1 test file with a table variant: stream a two-row table,
append characters to the last cell of the last row, assert first-row cell text
renderers received no updates.

**Verify**: `pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts src/lib/SvelteMarkdown.test.ts` → all pass.

### Step 4: Full gate and bench

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`. Then bench
`long-list` before (on `main`, or take the evidence numbers: total
16,317–16,758 ms, over-budget 407–418) and after.

**Verify**: after-log `median total work` for ours ≤ 11,000 ms on `long-list`.

## Test plan

- Red anchor: `TrackedText` update-log test on an open streaming list — fails
  today (earlier items' text renderers receive the changed list `raw`),
  passes after Step 2.
- Table variant after Step 3.
- Existing suite green: `SvelteMarkdown.test.ts` covers list/table rendering
  and snippet overrides; any failure there means a renderer contract changed —
  that is a STOP.

## Done criteria

- [ ] `pnpm check` 0 errors; `pnpm test` exits 0 with the two new tests passing
- [ ] `grep -n "items: _items, ...parserRest" src/lib/Parser.svelte` returns nothing
- [ ] `grep -n "dispatch(cellToken, cellRest)" src/lib/Parser.svelte` returns nothing
- [ ] Bench `long-list`: ours `totalWorkMsMedian ≤ 11,000` recorded in README
- [ ] No files outside scope modified

## STOP conditions

- Any test in `src/lib/SvelteMarkdown.test.ts` or `src/lib/**/*.test.ts` that
  asserts props received by a custom `listitem`/`tablecell` renderer or snippet
  starts failing — you touched the wrong spread.
- The Step 1 test still fails after Step 2: another prop is changing per frame
  (likely `text`); check what the log entries contain and report if it is not
  `raw`/`text`.
- Bench shows < 10% improvement on `long-list`: report the numbers; the
  remaining cost is elsewhere (Plan 005 territory), do not keep cutting props.

## Maintenance notes

- The three "strip before recursing" sites (root, generic block, list, table)
  should stay consistent; a reviewer should check any new branch in
  `Parser.svelte` strips `raw`/`text`/`tokens` before calling `dispatch`.
- If a future feature needs list-level data in item children (e.g. `start`
  for numbering), pass it explicitly rather than via the rest spread.
