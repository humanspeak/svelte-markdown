# Guard report — 013 tail-window-boundary-does-not-close-lists

**Recommendation: PASS** — every done criterion reproduced green; the streamed token tree now matches a one-shot parse at every chunk boundary of the bench prose corpus for chunk sizes 1, 7, 32 and 64.
**Reviewed at** 2fa41e4 · 2026-09-28 06:21 · **Plan planned at** 6e1abe7 (amended twice; original 6892589)
**Integrated** — no PR: batch convention is one branch → one PR at batch close. Snapshots `9ec976f` (lists/indented code), `6e1abe7` (heading/hr), `2fa41e4` (last token never stable) on `perf/stream-bench-flush-timing`.

## Done criteria

| Criterion                                                                      | Result         | Evidence                                                                                                                         |
| ------------------------------------------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` 0 errors; `pnpm test` exits 0 with the new describe block passing | met            | `COMPLETED 1202 FILES 0 ERRORS 3 WARNINGS`; `Test Files 160 passed`, `Tests 1176 passed`; lines 98.5%, branches 93%              |
| `grep canContinueAcrossBlankLine` matches definition + use                     | met            | `incremental-parser.ts:501` (use), `:525` (definition)                                                                           |
| Chunk-size sweep over the prose section exists and passes for 1, 7, 32, 64     | met            | `incremental-parser.test.ts:1237` `it.each([1, 7, 32, 64])`, calls `expectSemanticParity` after every chunk; in the 1176 passing |
| No files outside scope modified                                                | met            | `git diff --stat 6892589..HEAD -- src/lib` → only `incremental-parser.ts` and `incremental-parser.test.ts`                       |
| README status row updated                                                      | met (by guard) | this commit                                                                                                                      |

## Spirit

The plan set out to stop the tail window from splitting a list at a blank line. Execution found the same mechanism three times (list after `space`, heading/hr frozen at `\n`, closed fence frozen without `\n`), and guard's direct probe of marked showed the root: every block type moves its trailing newline into the following `space` token when a blank line arrives, so no last token can be frozen without diverging from a one-shot parse. The final shape — cut is always `tokens.length - 1`, plus a one-token walk-back for lists and indented code before a trailing `space` — removes the whole class rather than patching three instances, stays O(1) per append (the bookkeeping tests that pin "no prefix scan" still pass), and is pinned by five targeted cases plus a chunk-size sweep of the bench corpus. Spirit met; this is the correctness fix 006's parity gate was blocked on.

## Scope & conduct

- In-scope only: yes (two files across three snapshots).
- STOP conditions respected: yes, twice — each executor stopped on the sweep with a precise diagnosis (chunk size, source, streamed vs fresh shapes) instead of guessing; no test weakened or skipped. Deviations from the plan's code shape (`FENCE_OPEN_RE` constant, deleting `isStableAtSourceEnd` instead of stubbing it) were allowed by the plan or reported and are sound.
- Plan amendments: Revision 1 (Step 2c heading/hr) and Revision 2 (Step 2d last token never stable), both 2026-09-28, both rooted in reproduced evidence; see `013-…guard.md`.

## Residual risk / follow-ups

- Cost: a closed fence or heading that ends the stream is re-lexed once more on the following chunk; bounded to one block. Plan 011 measures prefix-proportional work and should confirm nothing here scales with the document.
- The Plan 006 bench parity detector must be re-run against this snapshot (006 resumes at Step 3 with its Step 2 verify repeated); Node repros in `evidence/006/` should now report zero mismatches.
- E2E (`pnpm test:e2e`) was not run by executors or guard; the unit sweep covers the token layer, the bench parity check will cover the rendered layer.
