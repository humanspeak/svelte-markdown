# Guard report — 006 open-html-constructs

**Recommendation: PASS** — unclosed HTML constructs of every kind are recognized, the fuzz edge case is green with seventeen added blocks, no existing assertion changed, and no test is marked red at the snapshot. A third independent corpus run by guard afterwards found one further principle (adjacent blocks), carried into plan 007.
**Reviewed at** 16558d2 · 2026-09-29 04:58 · **Plan planned at** 436eb28
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                                            | Result | Evidence                                                                                                              |
| ------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------- |
| No `red(` in the fuzz or parity files                                                | met    | grep count 0 at `16558d2`                                                                                             |
| `PARITY_STRICT=1` run green                                                          | met    | executor 67/67; nothing marked red, so guard's `pnpm test` covers it                                                  |
| `pnpm test` exits 0 with 0 expected fail; `pnpm check` 0 errors; `trunk check` clean | met    | 164 files, 1326 passed; `0 ERRORS 3 WARNINGS`; `✔ No issues`; lines 98.73%                                            |
| Bookkeeping performance tests and the task-list test pass unchanged                  | met    | no existing assertion changed anywhere                                                                                |
| The fuzz contains at least six additional edge blocks                                | met    | seventeen added                                                                                                       |
| Report states each mechanism, reproduction, and rule                                 | met    | comment/PI/declaration/CDATA/raw-text; cut inside a split HTML block (two variants); inline lexer state across blocks |
| No files outside scope modified                                                      | met    | four in-scope files; `token-cleanup.ts` untouched                                                                     |

## Spirit

The plan named one mechanism and one unknown. The executor diagnosed the unknown precisely — a cut inside one HTML block that cleanup split into several roots — and then, by widening the fuzz as instructed, found that marked's INLINE lexer state (an inline code tag or anchor tag left open) leaks across block boundaries in a one-shot parse. That is a property of marked nobody on this batch knew about, and it also affected the targeted definition re-lex from plan 003. Each rule is per-token or fixed-window. Spirit met.

## Scope & conduct

- In-scope only: yes. STOP conditions: none fired. Two mechanisms beyond the named ones were fixed under the plan's Step 4 allowance, each with a minimal red test first.

## Residual risk / follow-ups

- Guard's third independent corpus (159,099 updates checked) found 22 of 220 documents diverging at this snapshot, all from blocks adjacent to the open last block (empty list item then a marker; a look-alike heading that becomes a lazy continuation line). Now `ADJACENT_BLOCKS` in the fuzz (red, 17 failing documents) and the subject of plan 007.
- One marked detail is not modelled: `inRawBlock` is restored after a link only when a nested link was emitted inside link text.
- Documents that end inside an open inline code tag or anchor tag, or a split HTML block are fully re-lexed per update until it closes.
