# Guard log — 008 remaining-mechanisms

## Checkpoint 1 — 2026-09-29 — ON TRACK (final: PASS; one finding → plan 009)

0c79f1d · executor (opus, in-tree) fixed the three mechanisms on the first attempt each: an html root without a closing bracket counts as open; cleanup records the roots it expands out of an unterminated construct in a `WeakSet` (`isFromUnterminatedHtmlBlock`), with `isUnterminatedHtmlBlock` moved into `token-cleanup.ts`; a source containing a carriage return never uses the tail window (Step 4 option a). Snapshot-committed.

- Guard reproduced: `pnpm test` 164 files, 1358 passed, 0 expected fail, lines 98.76%, branches 92.89%; `pnpm check` 0 errors, 3 warnings (unchanged); `trunk check` clean; `red(` count 0.
- Guard read the diff: removed test lines are the three flips and one widened import; cleanup's rendered output is pinned by a new test; the carriage-return search covers the appended slice only.
- Deviation, accepted: the plan's guard "`<div>` + blank line + prose keeps the tail window" was wrong — a lone `<div>` is an unclosed opening tag and has been fully re-lexed since issue 291. The executor replaced it with a closed element and a late-closing tag.
- Guard reran every independent corpus as scratch (not committed): upstream-derived inputs alone 0 of 826; joined 0 of 1500, 0 of 1500, and 0 of 3000 with a new seed; fourth corpus 0 of 400; fourth corpus with new seeds 1 of 1200.
- The one failure is a new, narrow mechanism: after an unclosed `<a>` tag, an autolink (`<https://…>`) makes the state tracker clear marked's `inLink` state, which marked itself does not do. Anchored as a red test; plan 009 written.
