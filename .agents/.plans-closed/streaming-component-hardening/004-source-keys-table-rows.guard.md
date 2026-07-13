# Guard log — 004 source-keys-table-rows

## Checkpoint 1 — 2026-07-07 19:21 — DRIFTING

Base `241f129` (merge-base with origin/main) · branch `advisor/004-source-keys-table-rows` · Step 1 test committed (`826950d`), Step 2 fix + README uncommitted in working tree. First checkpoint.

**Done criteria all reproduced in-tree (not trusted from a report):**

- `pnpm check` → 0 errors (4 warnings, all pre-existing, unrelated files: Image.svelte, Parser.svelte, _UnsupportedHTML.svelte, CustomList.svelte).
- `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → 18/18 pass, incl. the new "keeps unchanged table body cell DOM mounted while a later cell grows during streaming".
- `pnpm test:only` (full) → 936/936 pass, 145 files. No table test broke on the new `src:` body-cell keys.
- `assignSourceKeysToChildren` walks `node.rows` — `render-metadata.ts:251-256`.
- Scope clean: only `render-metadata.ts` (in scope) + committed test (in scope) + `README.md` row (required). Plan file untouched (no tampering); no out-of-scope source files.
- README row 004 flipped TODO → DONE (`README.md:28`).

**New test is genuine, not gamed** (`SvelteMarkdown.issue-328.test.ts:676-703`): tags the "Anchor" body cell with `data-remount-probe`, grows a _different_ cell ("Grow"→"Growing") in the same row via a string-source streaming rerender, asserts `cellAfter).toBe(cellBefore)` and the probe attribute survived. Exercises the modified source-backed path (string `source` + `streaming`), and `toBe` on the DOM node is the right assertion for the intent.

**Finding — executor drift from the prescribed approach (`render-metadata.ts:254`):**
Plan's literal "Target shape" (step 2, plan lines 130-142) and the "Mirror the header treatment exactly" instruction (plan line 75) call for `assignSequentialSourceKeys(asNodeArray(row), absoluteOffset)` — the **same** base for every row. The executor instead wrote `absoluteOffset + rowIndex`.

- Unnecessary: within-row cell uniqueness (all Svelte keying needs, since each row's cells are their own keyed `{#each}`) comes from `assignSequentialSourceKeys`'s per-cell cursor + the `:zero:${index}` suffix (`render-metadata.ts:144-151`), independent of the row's base. Cross-row cell-key collisions are irrelevant (separate each-blocks). So `+ rowIndex` buys nothing the plan's shape lacked.
- Introduces a code-level regression the plan's shape avoids: a body row's cell keys become a direct function of its row index (base = `absoluteOffset + rowIndex`). If a row is inserted _before_ an existing row during streaming, that row keeps its `<tr>` (via `getStableRowKey`, per the existing row-insertion test) but its cells get new `src:` keys and **remount** — the exact tbody churn plan 004 exists to eliminate. Under the plan's literal `absoluteOffset` shape, cell keys are row-index-independent, so the cells stay mounted.
- Untested and unnoted: the new test only covers same-row sibling-cell growth (single body row). The existing "sibling row inserted before" test asserts `<tr>` identity only, and uses a token-array source (source-_less_ path, plan 012), so it never exercises plan 004's code. The executor left no report/note flagging the deviation, and the plan's maintenance note "confirm header cells and body cells now key the same way" is now false for rows beyond row 0 (header base = `absoluteOffset`; body row R base = `absoluteOffset + R`).

Classification: **executor drift, not plan defect** — the plan's prescribed shape was correct, achievable, simpler, and strictly better for the row-insertion case; the new test passes under it too. The mechanism is code-verified (`render-metadata.ts:144-154, 254`); I did not build a DOM-level row-insertion repro.

- Action: **reported to operator.** Recommend directing the executor to either (a) revert `render-metadata.ts:254` to the plan's literal `absoluteOffset` (no `+ rowIndex`), or (b) if `+ rowIndex` is intentional, add a streaming row-inserted-before cell-identity test proving cells stay mounted and document the rationale. Recommendation: (a). Not a violation; work otherwise meets every done criterion. Fix belongs on this branch before a `guard 004 final` integration gate.

## Checkpoint 2 — 2026-07-07 19:35 — ON TRACK (plan defect identified — amendment recommended)

Base `241f129` · same branch · Step 1 test still committed (`826950d`, unchanged), Step 2 fix + README still uncommitted. Executor **revised** `render-metadata.ts` since checkpoint 1.

**Correction to Checkpoint 1 — my prior finding was wrong.** At ckpt 1 I recommended reverting cell keys to the plan's literal plain-`absoluteOffset` shape. That is **incorrect**: `getStableRowKey` (`render-metadata.ts:358-362`) returns a row's own render key if set, else derives it from `getStableNodeKey(row[0], index)` — the **first cell's** key. Under the plan's literal shape every row's first cell keys to `src:${absoluteOffset}`, so all body rows would derive **duplicate** row keys → tbody row churn / duplicate-key breakage. I missed the first-cell derivation at ckpt 1. The executor's disambiguation is **necessary**, not gratuitous.

**Current implementation** (`render-metadata.ts:251-261`) — better than either prior form:

```ts
for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    setRenderKey(row, `src:${absoluteOffset}:row:${rowIndex}`) // explicit, distinct row key
    assignSequentialSourceKeys(asNodeArray(row), absoluteOffset) // cells at plain absoluteOffset (matches plan)
}
```

- Cell keys are now **row-index-independent** (plain `absoluteOffset`) → resolves my ckpt-1 concern that cells remount when a row is inserted before them.
- Rows get an **explicit** distinct key via `setRenderKey`, so row keying no longer depends on first-cell collisions. Row/cell keys live in separate `{#each}` blocks, so the header-cell/body-row-0 base overlap is harmless.

**Done criteria — all reproduced in-tree:**

- `pnpm check` → 0 errors (4 pre-existing unrelated warnings).
- `pnpm test:only` → 936/936 pass, 145 files.
- `assignSourceKeysToChildren` walks `node.rows` — `render-metadata.ts:251`.
- Scope clean: only `render-metadata.ts` + committed test + `README.md` row. Plan file **untampered** (`git diff HEAD -- 004-...md` empty). README row 004 = DONE.

**Coverage:** the append-row case in the source-backed path is covered — `SvelteMarkdown.issue-328.test.ts:648` "keeps existing table row identity while streaming appends table rows" uses `writeChunk` (string source) and asserts `rowAfter).toBe(rowBefore)`. The new ckpt-1 cell test covers same-row sibling-cell growth. **Gap:** no source-backed _row-inserted-before_ cell/row-identity test — under this scheme the explicit row key carries `rowIndex`, so inserting a row before an existing one remounts it (and its cells). This is inherent to position-keyed rows (no meaningful per-row source offset exists — plan's own caveat) and is not a plan regression (the plan never specified row keys); append is the normal streaming case.

**Classification: plan defect, not executor drift.** Execution surfaced a constraint the advisor missed — the plan's minimal cell-key change, applied literally, breaks row keys via `getStableRowKey`'s first-cell derivation. The executor correctly adapted (explicit row keys) within the in-scope file/function. Consequence: the plan's step-2 "Target shape" (lines 130-142) and "Mirror the header treatment exactly" instruction (line 75) no longer match the correct implementation, and the plan is silent on the row-key requirement it actually depends on.

- Action: **reported to operator; recommend PLAN AMENDMENT** (guard-only, needs operator agreement) to (a) replace the step-2 target shape with the explicit-row-key form, (b) add a note that `getStableRowKey` derives from the first cell so rows need their own key space, and (c) optionally add a source-backed multi-row row-identity done-criterion. No corrective work needed from the executor — the code is sound. Awaiting operator decision on the amendment.

## Checkpoint 3 — 2026-07-07 19:39 — PLAN AMENDED

Operator agreed to amend the plan (the Checkpoint 2 plan-defect finding). Amendment applied to `004-source-keys-table-rows.md`:

- **Executor-instructions block**: added a `> Revision 2026-07-07 (guard)` note explaining the original plain-`absoluteOffset` target shape is wrong (duplicate row keys via `getStableRowKey`'s first-cell derivation) and stating the corrected approach (explicit per-row key + row-index-independent cell keys).
- **Current state**: added a "Row-key dependency" paragraph documenting `getStableRowKey` (`render-metadata.ts:358-362`) returning the row's own key if set, else deriving from `row[0]`.
- **Step 2 "Target shape"**: replaced the `for (const row of rows)` / plain-`absoluteOffset`-only form with the corrected `for (let rowIndex...)` form that calls `setRenderKey` with the row key `src:<absoluteOffset>:row:<rowIndex>`, then `assignSequentialSourceKeys(row, absoluteOffset)`. This now matches the executor's actual code (`render-metadata.ts:251-261`) verbatim in intent.
- **Done criteria**: added a row-key criterion (explicit distinct row key; no duplicate `getStableRowKey` collapse), citing the covering test `issue-328.test.ts` "keeps existing table row identity while streaming appends table rows".
- **Maintenance notes**: corrected the "header and body cells key the same way" note to reflect the cell-vs-row split, and recorded the known limitation (position-based row key → row-inserted-before remounts in the source-backed path).

**`Planned at` deliberately NOT re-stamped.** The guard amendment process calls for re-stamping to HEAD, but the batch `README.md` carries a standing guard directive (README lines 13-19) to keep every plan's `Planned at` at `939f154`. `render-metadata.ts` is byte-identical at `939f154` and the current HEAD `826950d` (the only intervening commit, `826950d`, adds only the test), so re-baselining is a **no-op for the drift check** — the "Current state" excerpts still match live code at `939f154`. Honoring the batch directive (one consistent baseline across all 12 plans) outweighs the marginal forward-looking benefit of re-stamping a near-complete plan. Noted in the plan's `Planned at` line. Operator can override if a re-baseline is preferred.

Scope of this checkpoint's writes: plan file `004-...md` only (guard's prerogative, with operator agreement) + this log. No source touched. README table unchanged (no tracked field shifted; batch `939f154` directive remains valid).

Verdict: **PLAN AMENDED.** Plan and code now agree. The work remains ON TRACK against the amended plan; a `guard hardening 4 final` pass is the integration gate (re-run all criteria, full scope audit, then commit + PR on PASS).
