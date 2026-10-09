# Guard report — 008 remaining-mechanisms

**Recommendation: PASS** — the three mechanisms are fixed, no test is marked red at the snapshot, no existing assertion changed, and cleanup renders the same output. Guard's rerun of every independent corpus found one further narrow case (1 of 8426 documents), carried into plan 009.
**Reviewed at** 0c79f1d · 2026-09-29 · **Plan planned at** bf29d08
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                        | Result | Evidence                                                                   |
| ---------------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| No `red(` call remains; 0 expected failures                      | met    | grep count 0 at `0c79f1d`; 1358 passed                                     |
| `PARITY_STRICT=1` run fully green                                | met    | nothing marked red, so guard's `pnpm test` covers it                       |
| `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean  | met    | `0 ERRORS 3 WARNINGS`; lines 98.76%; `✔ No issues`                         |
| No existing assertion changed; one-shot rendered output the same | met    | removed test lines: three flips, one import; new test pins one-shot output |
| Report states the rule and location per mechanism                | met    | see the guard log                                                          |
| No files outside scope modified; nothing committed by executor   | met    | five in-scope files                                                        |

## Spirit

Three small fixes, no new special-case lists: marked decides what is an html root, cleanup records provenance without changing output, and carriage returns turn the fast path off instead of being modelled. Spirit met.

## Scope & conduct

- In-scope only: yes. STOP conditions: none fired.
- One plan guard was wrong and was replaced, with the measurement that shows why.

## Residual risk / follow-ups

- Option (a) covers cancelling length errors only when a carriage return is involved. No reproduction without one is known.
- Documents containing a carriage return, an html root without a closing bracket, or an unclosed construct are fully re-lexed per update.
- Plan 009: an autolink after an unclosed `<a>` tag (inline link state).
