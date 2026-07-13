# Plan 004: Source-offset render keys extend to table body cells (`rows`)

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- src/lib/utils/render-metadata.ts`
> On any change, compare "Current state" excerpts to live code; mismatch ⇒ STOP.
>
> **Revision 2026-07-07 (guard)**: The original step-2 "Target shape" (plain
> `absoluteOffset` for every row) is **wrong** — it makes every row's first cell
> key to `src:${absoluteOffset}`, and `getStableRowKey` derives a row's key from
> its first cell (`row[0]`) when the row has no key of its own, so all body rows
> collapse to duplicate row keys. Corrected below: assign each row an explicit
> distinct render key, and give the row's cells plain `absoluteOffset`. Cell keys
> must stay row-index-independent so a row inserted before an existing one does
> not remount that row's cells.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `939f154`, 2026-07-07 (held per the batch README's
  drift-check directive; `render-metadata.ts` is byte-identical at `939f154` and the
  current HEAD, so the drift baseline is unchanged by this amendment)

## Why this matters

In source-backed rendering (including streaming), `assignSourceKeysToChildren`
assigns stable `src:<offset>` render keys to a node's `tokens`, `items`, and
`header` children — but **not** its table `rows`. Table body cells therefore fall
through to object-identity fallback keys in `getStableNodeKey`. When a streamed
table is re-parsed in the tail window, its body cells get fresh objects → new
fallback keys → the entire `tbody` re-renders each flush instead of only the
changed cell. Header cells (which _do_ get source keys) already behave correctly,
so this also removes an inconsistency between header and body cells. Adding
`rows` to the source-key walk mirrors what `collectSourceLessIdentities` and
`assignHeadingIds` already do.

## Current state

- `src/lib/utils/render-metadata.ts` — per-instance render metadata (render keys,
  heading ids, source offsets in WeakMaps).

`assignSourceKeysToChildren`, `src/lib/utils/render-metadata.ts:247-251` — note
`rows` is absent:

```ts
const assignSourceKeysToChildren = (node: RenderMetadataNode, absoluteOffset: number) => {
    assignSequentialSourceKeys(asNodeArray(node.tokens), absoluteOffset)
    assignSequentialSourceKeys(asNodeArray(node.items), absoluteOffset)
    assignSequentialSourceKeys(asNodeArray(node.header), absoluteOffset)
}
```

For contrast, `assignHeadingIds` **does** walk `rows`,
`src/lib/utils/render-metadata.ts:272-277`:

```ts
const rows = asNodeArray(node.rows)
if (rows) {
    for (const row of rows) {
        assignHeadingIds(asNodeArray(row), options, slugger, nextHeadingNodes)
    }
}
```

`assignSequentialSourceKeys` (lines 131-156) takes `(nodes, absoluteOffset,
startIndex, startOffset)`, sets `sourceOffsets` and a `src:<offset>` render key
per node, and recurses via `assignSourceKeysToChildren`. `rows` is
`TableCell[][]` (array of rows, each an array of cells), so it needs the same
row-then-cells iteration `assignHeadingIds` uses.

**Important offset caveat**: `assignSequentialSourceKeys` advances a `cursor` by
each node's source length to compute per-node offsets. Table cells do **not**
have meaningful sequential source spans the way top-level tokens do (a table's
raw source is not a simple concatenation of cell `.raw`), so summing cell
`sourceLength` will produce arbitrary offsets. What matters for keys is
**stability and uniqueness**, not source accuracy: each cell must get a stable,
collision-free key derived from the row/cell position under the table's base
offset. Header cells already go through `assignSequentialSourceKeys` with the
same caveat and work in practice because the keys only need to be stable across
flushes, not accurate offsets. Give body cells the same plain-`absoluteOffset`
treatment header cells get.

**Row-key dependency (surfaced during execution, Revision 2026-07-07)**: rows are
keyed separately via `getStableRowKey`
(`src/lib/utils/render-metadata.ts:358-362`), which returns a row's own render key
if one is set and otherwise derives the row key from its **first cell**
(`getStableNodeKey(row[0], index)`). If body cells are keyed with plain
`absoluteOffset` and rows are given no key of their own, every row's first cell
keys to `src:${absoluteOffset}` → all body rows derive **duplicate** row keys.
Therefore each row must also be assigned an explicit, per-row-distinct render key
(`setRenderKey(row, ...)`) so row identity does not depend on first-cell keys.

## Commands you will need

| Purpose   | Command                                                   | Expected on success |
| --------- | --------------------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                              | exit 0, 0 errors    |
| 328 tests | `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                          | all pass            |
| Lint      | `trunk fmt && trunk check`                                | exit 0              |

## Scope

**In scope**:

- `src/lib/utils/render-metadata.ts` — `assignSourceKeysToChildren`.
- `src/lib/SvelteMarkdown.issue-328.test.ts` — add/extend a table-body DOM
  identity test (there is already a table-body-row identity test there — see
  "keeps a stable table body row mounted when a sibling row is inserted before
  it").

**Out of scope**:

- The source-less root-key quartet (`assignSourceLessRootKeys` and helpers) —
  that is plan 012.
- Heading-id logic (`assignHeadingIds`/`seedHeadingSlugger`) — plan 006.

## Git workflow

- Branch: `advisor/004-source-keys-table-rows` (`--no-track origin/main`).
- Commit style: `perf(render-metadata): assign stable source keys to table body cells`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Add a failing DOM-identity test for a streamed/source-backed table body cell

Extend `SvelteMarkdown.issue-328.test.ts`. There is an existing pattern for
asserting a DOM node stays mounted across an update (query an element, mutate the
source, re-render, assert `toBe` the same DOM node). Add a case: a table where a
body cell is unchanged across a source update that changes a _different_ cell/row;
assert the unchanged cell's DOM node keeps identity. Against current code this
should FAIL (body cells re-render).

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → the new
case FAILS, existing cases PASS.

### Step 2: Walk `rows` in `assignSourceKeysToChildren`

Extend `assignSourceKeysToChildren` to iterate `asNodeArray(node.rows)` and, for
each row: (1) assign the **row** an explicit, per-row-distinct render key (see the
"Row-key dependency" note in Current state above — without this, `getStableRowKey`
derives duplicate row keys from first cells), and (2) assign sequential source
keys to that row's cells under plain `absoluteOffset` (row-index-independent, so an
inserted-before row does not remount an existing row's cells). Target shape:

```ts
const assignSourceKeysToChildren = (node: RenderMetadataNode, absoluteOffset: number) => {
    assignSequentialSourceKeys(asNodeArray(node.tokens), absoluteOffset)
    assignSequentialSourceKeys(asNodeArray(node.items), absoluteOffset)
    assignSequentialSourceKeys(asNodeArray(node.header), absoluteOffset)
    const rows = asNodeArray(node.rows)
    if (rows) {
        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex]
            // Rows need their own key space: getStableRowKey() otherwise derives
            // duplicate row keys from first-cell keys. Cells mirror the header.
            setRenderKey(row, `src:${absoluteOffset}:row:${rowIndex}`)
            assignSequentialSourceKeys(asNodeArray(row), absoluteOffset)
        }
    }
}
```

**Verify**:

- `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → all pass, including
  the Step 1 case.
- `pnpm test:only` → all pass (watch for any table test asserting a specific key
  string; if one breaks because body cells now carry `src:` keys, that is the
  intended behavior change — update the assertion to reflect stable keys, and
  note it in your report).

### Step 3: Typecheck + lint

**Verify**: `pnpm check` → exit 0; `trunk fmt && trunk check` → exit 0.

## Test plan

- New/extended test in `SvelteMarkdown.issue-328.test.ts`: unchanged table body
  cell keeps DOM identity across a sibling-cell/row change under a source-backed
  render. Model on the existing "stable table body row" test.
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0.
- [ ] `pnpm test:only` exits 0; the new body-cell identity test passes.
- [ ] `assignSourceKeysToChildren` walks `node.rows` (grep shows the `rows` loop).
- [ ] Each row is given an explicit distinct render key (`setRenderKey(row, ...)`);
      body rows do not collapse to duplicate `getStableRowKey` keys. Covered in the
      source-backed path by `issue-328.test.ts` "keeps existing table row identity
      while streaming appends table rows".
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 004 is updated.

## STOP conditions

- `assignSourceKeysToChildren` doesn't match the excerpt (drift).
- Adding `rows` keys makes header-cell or heading tests fail — that suggests an
  offset/collision interaction; report the failing assertion rather than forcing
  it green.
- You conclude that body cells need genuinely accurate source offsets (not just
  stable keys) for some downstream consumer — that is a larger design question;
  stop and report.

## Maintenance notes

- If a future change makes cell keys carry _accurate_ source offsets, revisit the
  offset caveat above — today the keys only need to be stable and unique.
- Reviewer should confirm header and body **cells** get the same plain-`absoluteOffset`
  cell treatment, and that each **row** additionally carries its own explicit render
  key (`src:${absoluteOffset}:row:${rowIndex}`) so `getStableRowKey` does not fall
  back to first-cell derivation.
- Known limitation: the row key is position-based (`rowIndex`), so a row _inserted
  before_ an existing row in the source-backed path remounts it. Rows have no
  meaningful per-row source offset (see the offset caveat), and streaming normally
  appends rather than inserts. A source-backed row-inserted-before identity test
  would pin this behavior if it ever matters.
