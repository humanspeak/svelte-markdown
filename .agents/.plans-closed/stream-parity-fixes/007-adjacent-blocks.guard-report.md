# Guard report — 007 adjacent-blocks

**Recommendation: PARTIAL** — the plan's subject (adjacency without a blank line) is fixed and confirmed by two independent corpora, but the done criterion "no `red(` remains" is not met: the executor reached its three-iteration limit with two older mechanisms left, and guard found a third. All three are anchored as red tests and carried into plan 008.
**Reviewed at** d0e84c9 · 2026-09-29 · **Plan planned at** c259df8
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                           | Result  | Evidence                                                                                   |
| ------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `ADJACENT_BLOCKS` fuzz case flipped and green                       | met     | fuzz file: 5 passed, 0 expected fail                                                       |
| Executor's own corpus of at least 40 blocks added as a fuzz case    | met     | 140 blocks, 200 documents, 8 chunkings                                                     |
| No `red(` in the fuzz or parity files                               | NOT met | 2 left by the executor, 1 added by guard (`incremental-parser.parity.test.ts`)             |
| `pnpm test` exits 0; `pnpm check` 0 errors; `trunk check` clean     | met     | 164 files, 1345 passed, 2 expected fail at `d0e84c9`; `0 ERRORS 3 WARNINGS`; `✔ No issues` |
| Bookkeeping performance tests and the task-list test pass unchanged | met     | no existing assertion changed                                                              |
| No files outside scope modified                                     | met     | three in-scope files                                                                       |

## Spirit

The plan asked for one rule instead of more special cases, and that is what landed: the reused prefix ends at the last blank line that closes a block, with a bounded walk back over blocks a following line can still change. The separate definition-title rule was folded into it. The executor also found and fixed two reference-scope bugs that predate the batch. It respected the iteration limit and reported the remainder instead of patching on. Spirit met for the plan's subject.

## Scope & conduct

- In-scope only: yes. The iteration limit fired and was honored.
- Deviation, accepted: the walk is bounded by a cap of eight held roots rather than a fixed window; a longer chain refuses the boundary for that update.
- No benchmark was run. HTML-heavy documents whose pieces sit next to each other without blank lines may hit the cap and be fully re-lexed; plan 004's `html-blocks` scenario measures this.

## Residual risk / follow-ups

Three mechanisms remain, all narrow, all red-anchored, all present before this batch:

1. An unclosed comment or processing instruction that contains a tag (`<!--` then `<hr>` then a blank line).
2. CRLF combined with a blockquote whose raw gains a line break, so two length errors cancel and the integrity check passes.
3. A block-level tag name directly followed by a line break and a blank line (`<div` with no `>` yet).

Failure counts of guard's independent corpora by snapshot: 27 of 120, 17 of 150, 22 of 220, now 1 of 400 plus 11 of 3826 upstream-derived documents.
