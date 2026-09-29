# Guard log — 007 adjacent-blocks

## Checkpoint 1 — 2026-09-29 — DRIFTING (final: PARTIAL; remaining mechanisms → plan 008)

d0e84c9 · executor (opus, in-tree) added the adjacency walk (`isAdjacentOpenBlock`, `canAbsorbNextLine`, `isBlankLineAt`, `MAX_ADJACENT_HOLDS = 8`), split `countHeldTokens` into blank-line holds and the walk, tightened the reference-use detector (`COMPLETE_DEFINITION_LINE_RE`), flipped the `ADJACENT_BLOCKS` fuzz case, and added a 140-block corpus as the fifth fuzz case. It stopped at the three-iteration limit with two mechanisms left as `red(` anchors. Snapshot-committed.

- Guard reproduced: `pnpm test` 164 files, 1345 passed, 2 expected fail, lines 98.75%, branches 92.8%; `pnpm check` 0 errors, 3 warnings (unchanged); `trunk check` clean; `PARITY_STRICT=1` over the three parity files: 86 passed, 2 failed (the two anchors).
- Guard read the parser diff: every rule is per-token or bounded by the cap; no scan of the token array; no existing assertion changed; `token-cleanup.ts` untouched.
- Guard ran two independent checks as scratch (not committed):
    - Inputs from upstream `vercel/streamdown` tests (commit `0b6b20d`, inputs only): alone 0 of 826 diverge (was 1); joined by a blank line 7 of 1500 (was 9); joined by a newline or blank line 4 of 1500 (was 36). All 34 adjacency failures are gone. The 11 left are one mechanism: a block-level tag name directly followed by a line break (`<div` + blank line).
    - A fourth own corpus (99 blocks without trailing line breaks, eight joiners, 400 documents, five chunkings): 1 diverges, through CRLF (the cancelling-length anchor's mechanism).
- Action: added a third `red(` anchor for the cut tag; README row → PARTIAL; plan 008 written for the three remaining mechanisms; plan 004 now depends on 008.
