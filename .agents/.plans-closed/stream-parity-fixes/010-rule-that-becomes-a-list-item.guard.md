# Guard log — 010 rule-that-becomes-a-list-item

## Checkpoint 1 — 2026-09-29 — ON TRACK (final: PASS)

13d4fc2 · executor (opus, in-tree) added `OPEN_RULE_ITEM_RE` and `isOpenItemStart`, and used the helper in rule 3 of `countBlankLineHolds`. Snapshot-committed.

- Guard reproduced: `pnpm test` 164 files, 1410 passed, 0 expected fail, lines 98.76%, branches 92.92%; `pnpm check` 0 errors, 3 warnings (unchanged); `trunk check` clean; `red(` count 0.
- Guard read the diff: one condition replaced by the helper; the only removed test line is the flipped `red.each`.
- Final independent check as scratch (not committed), all with seeds never used before: the seed that had failed, 0 of 2000; fourth corpus, 0 of 3000; upstream-derived inputs combined, 0 of 3000.
- Action: README row → DONE; plan 004 stamped and dispatched. No known gap remains to document.
