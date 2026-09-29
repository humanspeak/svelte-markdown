# Guard log — 009 autolink-inline-state

## Checkpoint 1 — 2026-09-29 — ON TRACK (final: PASS; one finding → plan 010)

c6241dd · executor (opus, in-tree) added `isBracketLink` and used it in `stepInlineState`: a link or image whose raw starts with `[` or `!` clears the tracked `inLink` state; autolinks and bare URLs leave it. Images are now modelled too. Snapshot-committed.

- Guard reproduced: `pnpm test` 164 files, 1382 passed, 0 expected fail, lines 98.76%, branches 92.91%; `pnpm check` 0 errors, 3 warnings (unchanged); `trunk check` clean; `red(` count 0.
- Guard read the diff: one changed condition plus the helper; the only removed test line is the flip.
- The executor corrected the plan's probe: `**bold**` cannot show `inRawBlock`; `escaped: true` on later text tokens does. Its table from marked 18.0.14 shows no link construct clears `inRawBlock`.
- Guard reran independent corpora as scratch: the seed that had failed, 0 of 1200; upstream-derived with a new seed, 0 of 3000; fourth corpus with a new seed, 1 of 2000.
- The one failure: `- - -` after a loose list is a thematic break until the next character makes it a list item (`- - -c`). Anchored as three red tests; plan 010 written with a stopping rule for the batch.
