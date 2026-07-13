# Plan 003: `shrinkHtmlTokens` stops re-spreading unchanged list items and table cells

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before the next step. If
> anything in "STOP conditions" occurs, stop and report — do not improvise. When
> done, update this plan's status row in
> `.agents/.plans/streaming-component-hardening/README.md`.
>
> **Drift check (run first)**: `git diff --stat 256a49f..HEAD -- src/lib/utils/token-cleanup.ts`
> If it changed, compare the "Current state" excerpts against the live code; on
> a mismatch, treat it as a STOP condition.
>
> **Revision 2026-07-07 (guard)**: The identity-preservation cleanup work (Steps
> 1–3) is implemented and verified at the token-cleanup layer. Amendment adds
> Step 4 + a Done criterion requiring an **end-to-end remount assertion**: the
> plan's stated intent is "unchanged rows/items keep their DOM," but the original
> Done criteria only assert object identity at the cleanup layer and never
> exercise the DOM consequence. Identity is keyed to the DOM via
> `getStableNodeKey` (`render-metadata.ts:116`, which returns the token object
> itself as the Svelte `{#each}` key) — so a fresh object = a new key = a
> destroy/recreate of that item's subtree, losing focus/scroll/selection/
> transition/media state. That effect must be proven, not assumed. `Planned at`
> re-stamped `939f154` → `256a49f` (source byte-identical between them).

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (but coordinates with 011 — see Maintenance notes)
- **Category**: perf
- **Planned at**: commit `256a49f`, 2026-07-07 (re-stamped from `939f154` on amend; source unchanged)

## Why this matters

`shrinkHtmlTokens` allocates a fresh object for **every** list item, table header
cell, and table body cell on every clean pass, via `{ ...item, ... }` /
`{ ...cell, ... }`. During streaming (the library's headline case: an LLM
emitting a long list or table), the actively-growing block is the last token and
sits inside the re-lexed tail window on every flush (~30/sec), so all of its
items/cells are re-spread each flush — O(items) allocations per flush, O(items²)
over the stream. Worse, each re-spread produces a **new object identity**, which
discards the identity that `reuseStableStreamingTokens` and the render-key
WeakMaps rely on to keep Svelte components mounted. Returning the same object
when a child clean is a no-op both cuts the allocations and preserves identity,
so unchanged rows/items keep their DOM.

## Current state

- `src/lib/utils/token-cleanup.ts` — token cleanup pipeline. `shrinkHtmlTokens`
  is the entry (called via `lexAndClean` in `parse-and-cache.ts:33-41`).

The re-spread patterns, `src/lib/utils/token-cleanup.ts:558-581`:

```ts
} else if (token.type === 'list') {
    token.items = token.items.map((item: Tokens.ListItem, index: number) => ({
        ...item,
        listItemIndex: index,
        tokens: item.tokens ? shrinkHtmlTokens(item.tokens) : []
    }))
    expanded.push(token)
} else if (token.type === 'table') {
    const tableToken = token as Tokens.Table
    if (tableToken.header) {
        tableToken.header = tableToken.header.map((cell: Tokens.TableCell) => ({
            ...cell,
            tokens: cell.tokens ? shrinkHtmlTokens(cell.tokens) : []
        }))
    }
    if (tableToken.rows) {
        tableToken.rows = tableToken.rows.map((row: Tokens.TableCell[]) =>
            row.map((cell: Tokens.TableCell) => ({
                ...cell,
                tokens: cell.tokens ? shrinkHtmlTokens(cell.tokens) : []
            }))
        )
    }
    expanded.push(token)
}
```

Key facts the fix must preserve:

1. **`listItemIndex` stamping**: each list item gets `listItemIndex: index`. The
   original marked `ListItem` does not carry this, so on the _first_ clean of an
   item it must still be added. Only skip re-allocation when the item already has
   the correct `listItemIndex` **and** its cleaned `tokens` are reference-equal
   to the input `tokens`.
2. **Nested cleanup**: `shrinkHtmlTokens(item.tokens)` must still run so nested
   HTML inside items/cells is expanded. The optimization is: if that recursive
   call returns the **same array reference** it was given (no nested change),
   and the item already has the right `listItemIndex`, return the original
   `item`/`cell` object unchanged.
3. **`cell.tokens ? … : []`**: cells/items with no `tokens` currently get `[]`.
   Preserve that behavior on first clean.

Note that `shrinkHtmlTokens` currently **mutates** the input array's element
arrays in place for the non-html/non-list/non-table branch (line 556:
`t.tokens = shrinkHtmlTokens(t.tokens)`), and returns `pairFlatHtmlTokens(expanded)`.
The recursive call for item/cell tokens does _not_ currently guarantee returning
the same reference when nothing changed — check whether `shrinkHtmlTokens`
returns its input array unchanged when there is nothing to expand. It does not
today (it always builds a new `expanded` array and returns
`pairFlatHtmlTokens(expanded)`). So a pure "reference-equal ⇒ skip" test on the
recursive result will almost never fire. **This is the crux**: to make identity
preservation effective you must make the no-op case detectable.

## Approach decision (read before coding)

Because `shrinkHtmlTokens` always returns a fresh array, you cannot cheaply
detect "nothing changed" from its return value alone. Two viable strategies —
pick **Strategy A** unless it proves infeasible:

- **Strategy A (structural equality skip, lower risk)**: For each item/cell,
  compute `cleanedTokens = item.tokens ? shrinkHtmlTokens(item.tokens) : []`.
  Then decide whether to reuse the original object: reuse when
  `item.listItemIndex === index` (for list items) / cells always need index-free
  check, AND `tokensShallowEqual(item.tokens, cleanedTokens)` where
  `tokensShallowEqual` compares length and per-index reference equality. If they
  are shallow-equal, assign `item.tokens = item.tokens` (keep original) and
  return the original `item` object (only stamping `listItemIndex` in place if
  missing). Otherwise fall back to the current spread. This keeps the recursive
  work but avoids the object churn and identity loss when the subtree was
  unchanged.

- **Strategy B (mutate in place)**: Instead of `.map(... => ({...item}))`,
  mutate: `item.tokens = item.tokens ? shrinkHtmlTokens(item.tokens) : []` and
  `item.listItemIndex = index`, keeping the original `item` object. This is the
  simplest identity-preserving form but **mutates caller-visible token objects**;
  verify no test depends on the input token objects being left untouched. Given
  `shrinkHtmlTokens` already mutates in the html-block branch (line 556), this is
  consistent with existing behavior, but confirm via the test suite.

Prefer Strategy A if the test suite shows any reliance on non-mutation of item
inputs; prefer Strategy B if the suite is clean under mutation (simpler, fewer
allocations). Run the suite under both if unsure. **STOP and report** if neither
keeps all existing `token-cleanup` tests green.

## Commands you will need

| Purpose   | Command                                                                                               | Expected on success |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                                                                          | exit 0, 0 errors    |
| Cleanup   | `pnpm test:only src/lib/utils/token-cleanup.test.ts`                                                  | all pass            |
| Streaming | `pnpm test:only src/lib/utils/streaming-token-reuse.test.ts src/lib/utils/incremental-parser.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                                                                      | all pass            |
| Remount   | run the file holding the new remount assertion (Step 4)                                               | all pass            |
| Lint      | `trunk fmt && trunk check`                                                                            | exit 0              |

## Scope

**In scope**:

- `src/lib/utils/token-cleanup.ts` — the list/table branches of `shrinkHtmlTokens`
  (and a small `tokensShallowEqual` helper if Strategy A).
- `src/lib/utils/token-cleanup.test.ts` — add identity-preservation tests.
- One test file for the Step 4 **remount assertion** — either a component-level
  test under `src/lib/` (e.g. a `SvelteMarkdown.*.test.ts` driving a streaming
  update) or a Playwright test under `tests/`. Adding this file (only) is in
  scope; do not modify `render-metadata.ts` or the reuse walk to make it pass —
  if the assertion fails, that is a STOP condition, not license to touch the
  render layer.

**Out of scope**:

- The html-block branch (lines 550–557, 582–584) and `pairFlatHtmlTokens` —
  leave the HTML nesting logic alone.
- `streaming-token-reuse.ts` and `render-metadata.ts` — this plan only changes
  _what identities cleanup produces_, not the reuse walk.

## Git workflow

- Branch: `advisor/003-token-cleanup-preserve-identity` (`--no-track origin/main`).
- Commit style: conventional commits, e.g.
  `perf(cleanup): preserve list/cell identity across clean passes`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Characterize current behavior with a test first

Before changing anything, add a **characterization test** in
`token-cleanup.test.ts` that documents the identity you want: clean a `list`
token twice (same input item objects with the same nested tokens), and assert
what _should_ hold after the fix — that unchanged items keep object identity
across two `shrinkHtmlTokens` calls. Run it now; it should FAIL against current
code (proving the churn exists). This is your regression guard.

Also add the same for a `table` token's body rows/cells.

**Verify**: `pnpm test:only src/lib/utils/token-cleanup.test.ts` → the new
identity tests FAIL (expected at this step), existing tests PASS.

### Step 2: Implement the identity-preserving clean (Strategy A or B)

Apply the chosen strategy to the `list` and `table` branches so unchanged
items/cells keep their object identity while `listItemIndex` stamping and nested
expansion still happen on first clean.

**Verify**:

- `pnpm test:only src/lib/utils/token-cleanup.test.ts` → all pass, **including**
  the Step 1 identity tests now.
- `pnpm test:only src/lib/utils/streaming-token-reuse.test.ts src/lib/utils/incremental-parser.test.ts`
  → all pass.

### Step 3: Full suite + typecheck + lint

**Verify**:

- `pnpm check` → exit 0.
- `pnpm test:only` → all pass.
- `trunk fmt && trunk check` → exit 0.

### Step 4: Prove the DOM consequence (remount assertion)

The point of Steps 1–3 is that unchanged streaming rows/items **keep their DOM**,
because identity flows to the Svelte `{#each}` key via `getStableNodeKey`
(`render-metadata.ts:116`). Steps 1–3 only prove the _precondition_ (object
identity at the cleanup layer). Add ONE test that proves the _effect_:

Render `SvelteMarkdown` with a streaming list (or table), then push an
append-only update that grows a **later** item while leaving an earlier item
unchanged. Assert the earlier item's DOM node is the **same node instance**
across the update — i.e. it was not destroyed and recreated. Concretely, grab a
reference to the earlier `<li>` (or a marker/DOM node inside it) before the
update and assert `after === before` (same element reference), or stamp
component-local state / a `data-*` attribute and assert it survives. A remount
would replace the node and drop the stamp.

Do **not** touch `render-metadata.ts` or the reuse walk to make this pass. If the
node _is_ remounted, the identity chain has a gap above the cleanup layer — STOP
and report (it likely belongs to plan 011), do not paper over it here.

**Verify**: the new remount test passes; `pnpm test:only` (and, if the test is a
Playwright test, `pnpm test:e2e`) stays green.

## Test plan

- New tests in `token-cleanup.test.ts`: (1) unchanged list items keep identity
  across two cleans; (2) a _changed_ nested token in one item produces a new
  object for that item but not its siblings; (3) same two for table body cells;
  (4) `listItemIndex` is present and correct after clean; (5) items/cells with no
  `tokens` still get `[]`.
- **Remount test (Step 4)**: a streaming update that grows a later item asserts
  an earlier, unchanged item's DOM node survives (same element reference / a
  stamped attribute persists) rather than being destroyed and recreated.
- Structural pattern: existing cases in `token-cleanup.test.ts`; for the remount
  test, an existing `SvelteMarkdown.*.test.ts` or `tests/imperative-streaming.test.ts`.
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0.
- [ ] `pnpm test:only` exits 0; new identity tests pass.
- [ ] Cleaning a list/table twice with unchanged children preserves item/cell
      object identity (asserted by test).
- [ ] **Remount assertion (Step 4)**: a streaming append that grows a later item
      leaves an earlier unchanged item's DOM node intact (same element reference /
      persisted stamp), proving the identity preservation actually keeps the DOM.
- [ ] `listItemIndex` remains correct on all list items after clean.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 003 is updated.

## STOP conditions

- The list/table branches don't match the excerpts (drift since 939f154).
- Neither Strategy A nor B keeps all existing `token-cleanup` tests green —
  report which tests break and under which strategy.
- Preserving identity causes a streaming test in
  `streaming-token-reuse.test.ts`/`incremental-parser.test.ts` to fail — that
  means the reuse layer had a hidden dependency on fresh identities; report it
  (do not paper over it here).

## Maintenance notes

- This plan increases how often `reuseStableStreamingTokens` (plan 011) can keep
  a node by reference. If 011 lands later and unifies the reuse identity rule,
  re-verify the identity tests here still hold.
- Reviewer should scrutinize whether Strategy B's in-place mutation is visible to
  any caller passing pre-parsed token arrays (the `Array.isArray(source)` path in
  `SvelteMarkdown.svelte`). If callers can pass tokens they expect untouched,
  Strategy A is required.
