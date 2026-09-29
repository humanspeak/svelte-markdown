# Guard log — 002 block-boundaries

## Checkpoint 1 — 2026-09-29 03:42 — PLAN AMENDED (work ON TRACK)

4e1ab97 · executor (opus, in-tree) delivered the list look-back, the unpaired-opening-tag detector, flipped bucket B, added guards. Snapshot-committed.

- Guard reproduced: `pnpm test` 163 files, 1265 passed / 7 expected fail, lines 98.68%; `pnpm check` 0 errors; `trunk check` clean; remaining `red(` calls 6 + 1 (buckets C and D only).
- Deviation 1 (list rule limited to a last paragraph that is a partial ordered marker, `/^ {0,3}\d{1,9}$/`): the plan's broader wording broke an existing task-list test; the narrow rule is what the plan's reasoning describes, avoids re-lexing a list during every chunk of a following paragraph, and the chunk-size sweep plus fuzz (loose bullets with an indented continuation) pass. Judged sound.
- Deviation 2 (tag-less source ending in `/>` is NOT excluded): cleanup tags genuinely self-closed and void elements, so a tag-less `/>` source is an opening tag with an unquoted attribute (`<a href=/x/>`); a new guard pins it. Judged sound.
- Guard probe (scratch test, removed): documents with a root-level `<br>`, `<hr>` or `<img>` report `usedTailWindow [false,false,false]` on later appends; `<br/>` and no-HTML documents report `[true,true,true]`. Cause: cleanup rewrites void tags one character longer and records no `sourceLength`, so plan 001's integrity guard trips forever. Classification: PLAN DEFECT (the plan's Step 5 only considered paired blocks).
- Action: plan amended — Step 7 (record true `sourceLength` wherever cleanup changes a root token's raw length), baseline re-stamped to `4e1ab97`. Fix-dispatch (opus, fresh, in-tree).
