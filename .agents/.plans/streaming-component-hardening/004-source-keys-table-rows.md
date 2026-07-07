# Plan 004: Source-offset render keys extend to table body cells (`rows`)

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- src/lib/utils/render-metadata.ts`
> On any change, compare "Current state" excerpts to live code; mismatch ⇒ STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `939f154`, 2026-07-07

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
flushes, not accurate offsets. Mirror the header treatment exactly so body cells
match header cells.

## Commands you will need

| Purpose   | Command                                                   | Expected on success |
| --------- | --------------------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                              | exit 0, 0 errors    |
| 328 tests | `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                          | all pass            |
| Lint      | `pnpm lint`                                               | exit 0              |

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
each row, assign sequential source keys to that row's cells under
`absoluteOffset`, mirroring the header treatment and `assignHeadingIds`'s row
loop. Target shape:

```ts
const assignSourceKeysToChildren = (node: RenderMetadataNode, absoluteOffset: number) => {
    assignSequentialSourceKeys(asNodeArray(node.tokens), absoluteOffset)
    assignSequentialSourceKeys(asNodeArray(node.items), absoluteOffset)
    assignSequentialSourceKeys(asNodeArray(node.header), absoluteOffset)
    const rows = asNodeArray(node.rows)
    if (rows) {
        for (const row of rows) {
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

**Verify**: `pnpm check` → exit 0; `pnpm lint` → exit 0.

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
- Reviewer should confirm header cells and body cells now key the same way.
