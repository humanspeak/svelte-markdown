# Guard log — 012 simplify-sourceless-root-keys

## Checkpoint 1 — 2026-07-10 08:35 — ON TRACK

`5dbf32b` · final close-out; executor finished with a "reject" recommendation

- Drift check pre-cleared by guard before dispatch. Plan's `Planned at` is `939f154`;
  plan 004 has since landed and grew `render-metadata.ts` (+299/-14), so the plan's
  line numbers are stale. Every named member of the source-less quartet still exists
  with the same semantics (`SourceLessRootRecord` now `render-metadata.ts:51`,
  `previousSourceLessRoots` `:173`, `collectSourceLessIdentities` `:224`,
  `countIdentityOverlap` `:245`, `findPreviousSourceLessRoot` `:256`,
  `assignSourceLessRootKeys` `:282`). Line-shift only ⇒ not a STOP; no plan amendment.
- Reject is evidence-backed, not evasion. The plan pre-authorized this exact path:
  Step 2 names first-child churn and reorder as where representative-identity models
  break, and STOP condition 2 says a candidate failing either "do not ship it; either
  fix or reject."
- Guard independently tested the executor's "no third option" claim. `SourceLessRootRecord`
  (`render-metadata.ts:51-55`) holds `{key, identities: Set, type}` and **no node
  reference**, so the `Set` is the sole structure pinning the prior token tree — #339's
  memory complaint is real. The unexamined alternative (retain the root node, recompute
  identities lazily) transitively pins the same subtree, so it fails #339's actual goal
  while keeping both helpers. Executor's conclusion survives the option it did not name.
- New tests are load-bearing, not vacuous. All three assert real DOM element identity
  (`expect(itemAfter).toBe(itemBefore)`, `SvelteMarkdown.issue-328.test.ts:835`), and
  the first-child-churn case genuinely discriminates: under either #339 candidate the
  wrapper's key falls back to the fresh `node` object, remounting the reused `<li>`.
- The three pre-existing source-less identity tests are untouched — the diff is purely
  additive (`+107` lines appended after line 796), so no criterion was met by weakening
  a test.
- All done criteria (rejecting branch) reproduced by guard, not taken on report:
  `pnpm check` → 0 errors / 4 pre-existing warnings; `pnpm test:only` → 142 files,
  922 tests passed; `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → 25
  passed; `trunk fmt && trunk check` → "No issues", 2 modified files.
- Scope clean. `git diff --name-only -- src/lib/utils/render-metadata.ts` → empty;
  only `SvelteMarkdown.issue-328.test.ts` and the batch `README.md` changed.
- Executor honored the no-commit / no-plan-edit rules: it left the tree dirty for guard
  and did not touch `012-simplify-sourceless-root-keys.md`.
- Note on the snapshot commit: made with `--no-verify`. Guard ran the hook's gates
  (`trunk fmt && trunk check`, `pnpm check`) independently beforehand; both clean.
- Action: reported to operator. PR withheld pending operator confirmation — guard does
  not publish outward-facing artifacts unprompted.
