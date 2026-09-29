# Guard report — 009 autolink-inline-state

**Recommendation: PASS** — the tracker now clears the link state exactly when marked does, decided from the token's own fields; no test is marked red at the snapshot and no existing assertion changed.
**Reviewed at** c6241dd · 2026-09-29 · **Plan planned at** 988b8e8
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                       | Result | Evidence                                               |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| No `red(` call remains; 0 expected failures                     | met    | grep count 0 at `c6241dd`; 1382 passed                 |
| Report contains the table of what marked does                   | met    | nine constructs, both states, marked 18.0.14           |
| `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean | met    | `0 ERRORS 3 WARNINGS`; lines 98.76%; `✔ No issues`     |
| No existing assertion changed; in scope; nothing committed      | met    | three in-scope files; one removed test line (the flip) |

## Spirit

The plan said "do not guess", and the executor found that the plan's own probe for the second state was unable to detect anything, replaced it, and verified its fix by putting the old rule back (five tests failed). Spirit met.

## Residual risk / follow-ups

- The tracker mirrors marked internals; the new guards will fail on a marked upgrade that changes them.
- Plan 010: a thematic break made of spaced bullet markers after a loose list.
