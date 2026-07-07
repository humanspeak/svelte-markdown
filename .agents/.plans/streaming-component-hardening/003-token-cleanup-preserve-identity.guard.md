# Guard log — 003 token-cleanup-preserve-identity

## Checkpoint 1 — 2026-07-07 17:45 — ON TRACK

Base `256a49f` (origin/main == HEAD) · branch `advisor/003-token-cleanup-preserve-identity` · working tree (uncommitted). First checkpoint. Executor chose **Strategy A** (structural-equality skip), the plan's lower-risk / required-when-callers-pass-tokens option.

Drift check clean: `token-cleanup.ts` is byte-identical between the plan's `Planned at` `939f154` and HEAD; the diff's removed lines match the plan "Current state" excerpt (`token.items.map(... => ({...item, listItemIndex, tokens}))` etc.) verbatim. No STOP condition tripped.

Functional intent — the point of the plan — is satisfied:

- Identity preserved: `cleanListItem`/`cleanTableCell` (`token-cleanup.ts:527-556`) return the _original_ object when `listItemIndex === index` (items) and `tokensShallowEqual(orig, cleaned)` holds. The crux the plan flagged (shrinkHtmlTokens always returns a fresh _array_, so array-ref skip never fires) is correctly sidestepped: `tokensShallowEqual` compares length + per-_element_ reference (`token-cleanup.ts:522-525`), and the html-block branch pushes the same element objects when unchanged, so the predicate fires on real no-op passes. Proven empirically, not assumed — the two "identity across clean passes" tests go green, which can only happen if the reuse branch actually executes.
- `listItemIndex` stamping intact: first clean has `listItemIndex === undefined !== index` → falls to spread and stamps; asserted `=== 0 / 1` after clean (`token-cleanup.test.ts` new test 1).
- No-tokens → `[]` preserved: falsy `tokens` → `cleanedTokens = []`, `tokensShallowEqual(undefined, [])` is false → spread path yields `tokens: []` (covered by the pre-existing `rows[0][0].tokens toEqual([])` test).
- Sibling isolation on change: mutating one item/cell's tokens to html re-spreads only that one; the untouched sibling keeps identity (new tests 2 & 4, `.not.toBe` + `.toBe`).

Done criteria reproduced in-tree (not trusted from a report):

- `pnpm check` → 0 errors (4 warnings all pre-existing, unrelated files: Image.svelte, Parser.svelte, _UnsupportedHTML.svelte, CustomList.svelte).
- `pnpm test:only` → 934/934 pass, incl. the 4 new identity tests.
- `pnpm test:only token-cleanup + streaming-token-reuse + incremental-parser` → 80/80 — the reuse layer had no hidden dependency on fresh identities (STOP condition #3 not tripped).
- `trunk check` (eslint+prettier) on both changed files → no issues.
- README row 003 flipped TODO → DONE (`README.md:27`).

Scope audit clean: only the two in-scope source files (`token-cleanup.ts`, `token-cleanup.test.ts`) + the required `README.md` row are modified; plan `003-...md` untouched (no tampering); no untracked files under `src/`. Out-of-scope surfaces (html-block branch, `pairFlatHtmlTokens`, `streaming-token-reuse.ts`, `render-metadata.ts`) left alone.

Minor note (not blocking): identity tests only cover table _body_ cells for the `.toBe` assertions; header cells share the same `cleanTableCell` path so they're covered by code, just not asserted. Plan's Test plan only required body cells — no gap.

Verdict: **ON TRACK.** Nothing to correct. Work is uncommitted — a `guard 003 final` pass is the integration gate (commit + PR); this checkpoint integrates nothing.

## Checkpoint 2 — 2026-07-07 18:05 — PLAN AMENDED

Operator raised that in a reactive framework object identity has real DOM consequences — the plan's actual payload, not merely allocation savings. Traced and confirmed the chain is mechanical, not incidental:

- `render-metadata.ts:116` `getStableNodeKey(node, index)` returns the **token object itself** as the Svelte `{#each}` key when no WeakMap render key exists (`return node`), and the render-key WeakMaps (`render-metadata.ts:103`) are themselves keyed by object identity. So the keyed each-block over list items / table rows is keyed, transitively, on token object identity.
- Consequence: a fresh `{...item}` from cleanup = a key Svelte has never seen = **destroy + recreate** of that item's DOM subtree every flush → loss of focus, text selection, scroll position, in-flight CSS transitions, `<img>`/`<video>`/`<iframe>` load state, and component-local `$state`.

Coverage gap identified: plan 003's original Done criteria assert object identity **at the cleanup layer only** (`.toBe` unit tests) and run `pnpm test:only` — no test exercises the DOM remount consequence. `tests/reactivity.test.ts` and `tests/imperative-streaming.test.ts` have no mount-count / same-node assertion. So the effect the plan is _named for_ was proven only transitively ("identity preserved" + "keying depends on identity"), never end-to-end.

**Classification: not executor drift — plan defect (verification altitude).** The executor faithfully satisfied the plan as written; the plan itself stopped one layer below its stated intent (`Why this matters`: "unchanged rows/items keep their DOM"). This is the case that justifies amending the plan, not lowering a standard — I am _raising_ the bar to match the intent, with operator agreement (they chose "amend 003 + add remount test").

Amendment applied to `003-token-cleanup-preserve-identity.md`:

- Dated `Revision 2026-07-07 (guard)` note under the executor-instructions block explaining the DOM chain and the added requirement.
- New **Step 4** (remount assertion) + **Test plan** entry + **Done criterion** requiring an end-to-end test: a streaming append that grows a _later_ item leaves an earlier unchanged item's DOM node intact (same element reference / persisted stamp).
- **In scope** widened to permit ONE new remount-test file (component-level or Playwright), with an explicit guard: do **not** modify `render-metadata.ts` or the reuse walk to make it pass — a failing assertion is a STOP condition (likely belongs to plan 011), not license to touch the render layer.
- `Planned at` re-stamped `939f154` → `256a49f` and the drift-check SHA updated to match (source byte-identical between the two, so the drift baseline is unchanged in substance).

`README.md` row 003 flipped **DONE → IN PROGRESS** ("cleanup + identity tests done; Step 4 remount assertion pending") — with an unmet Done criterion, DONE was no longer honest.

No source code touched. Action: plan amended with operator agreement; back to the operator to have the executor pick up the revised plan and add the Step 4 test. `final` close-out deferred until Step 4 lands and its Done criterion is verified.

## Checkpoint 3 — 2026-07-07 18:42 — final — PASS

Close-out + integration gate over `17b9a14` + working tree. Executor landed the Step 4 remount test.

Step 4 verified genuine, not gamed:

- `SvelteMarkdown.issue-328.test.ts:591` "keeps unchanged list item DOM mounted while a later item grows during streaming" — streams `- Anchor\n- Grow`, stamps `data-remount-probe=kept` on the live "Anchor" `<li>`, appends `ing` (Grow → Growing), then asserts `itemAfter).toBe(itemBefore)` (same element) **and** `toHaveAttribute('data-remount-probe','kept')`. A hand-set DOM attribute cannot survive a Svelte destroy/recreate, so this conclusively proves the node was never remounted — the plan's actual intent, proven end-to-end. Uses the pre-existing `TrackedListItem.svelte` (`<li data-tracked-list-item={text}>`); no new source component.
- STOP respected: the render layer was NOT touched to make it pass. `git diff --stat main...HEAD` source = `token-cleanup.ts`, `token-cleanup.test.ts`, `SvelteMarkdown.issue-328.test.ts` only — no `render-metadata.ts` / reuse-walk edit. The cleanup-layer fix alone carries the DOM guarantee.

All done criteria reproduced in-tree: `pnpm check` → 0 errors (4 pre-existing warnings); `pnpm test:only` → 145 files / **935** tests pass (934 + the new remount test); `SvelteMarkdown.issue-328.test.ts` → 17/17; `trunk check` on the test → no issues. Drift clean; no tampering (executor touched only the README status row it is instructed to update; plan `.md` + guard log left to guard).

Verdict: **PASS.** Wrote close-out report `003-...guard-report.md`. Integrating the Step-4 verified work (remount test + README) via the `commit` and `pr` skills; report's Integrated line records the commit SHA + PR URL. Merge remains the operator's call.
