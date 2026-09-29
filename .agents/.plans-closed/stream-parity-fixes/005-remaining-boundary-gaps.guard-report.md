# Guard report — 005 remaining-boundary-gaps

**Recommendation: PASS** — the three mechanisms the plan named are fixed, the generative fuzz gap case is green with twelve added blocks, and no test is marked red at the snapshot. A second independent corpus run by guard afterwards found a further mechanism (HTML constructs that a blank line does not end), carried into plan 006.
**Reviewed at** cfbb204 · 2026-09-29 04:29 · **Plan planned at** 181ab17
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                                            | Result | Evidence                                                                                                            |
| ------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------- |
| No `red(` in the fuzz or parity files                                                | met    | grep count 0 at `cfbb204`                                                                                           |
| `PARITY_STRICT=1` run of the fuzz and both parity files green                        | met    | executor 46/46; nothing is marked red, so guard's `pnpm test` covers it                                             |
| `pnpm test` exits 0 with 0 expected fail; `pnpm check` 0 errors; `trunk check` clean | met    | 164 files, 1305 passed; `0 ERRORS 3 WARNINGS`; `✔ No issues`; lines 98.69%                                          |
| Bookkeeping performance tests pass unchanged                                         | met    | in the 1305 passing; no assertion in that describe changed                                                          |
| The fuzz contains at least six additional gap blocks                                 | met    | twelve added                                                                                                        |
| Report lists every implementation-pinning assertion that changed                     | met    | two tests: the duplicate-definition lexer-call list, and one `usedTailWindow` sequence; no output assertion changed |
| No files outside scope modified                                                      | met    | four in-scope files                                                                                                 |

## Spirit

The rules are now in one helper (`countHeldTokens`) that inspects at most three tokens, and each held block joins the prefix as soon as another block follows, so the `large-closed-block` concern is respected by construction. The executor widened the title rule beyond the plan's wording after finding that marked accepts a title indented by any whitespace, and pinned that with a test. Two of the plan's own "red" tests turned out green already; the executor kept them as guards and found the real chunking from the failing fuzz document as the red anchor. Spirit met.

## Scope & conduct

- In-scope only: yes. STOP conditions: none fired; all 13 failures fit the three named mechanisms.
- Plan 001's keep-and-flag behavior is reversed here as planned: a fast-path result that fails the length check is discarded and the update re-lexed in full.

## Residual risk / follow-ups

- Guard's second independent corpus (133,615 updates checked) found 17 of 150 documents diverging at this snapshot, nearly all an unclosed HTML comment frozen before its terminator; one `<li>` / closing-tag case. Now `EDGE_BLOCKS` in the fuzz (red, 7 failing documents) and the subject of plan 006.
- Updates that drop or rewrite source now lex twice (tail, then full). Rare by construction; plan 004 measures the common scenarios.
