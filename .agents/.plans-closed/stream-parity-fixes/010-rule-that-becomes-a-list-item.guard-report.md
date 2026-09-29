# Guard report — 010 rule-that-becomes-a-list-item

**Recommendation: PASS** — the blank-line hold covers a thematic break that can still become a list item; no test is marked red; the final independent check found no diverging document in 8000.
**Reviewed at** 13d4fc2 · 2026-09-29 · **Plan planned at** ecf071f
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                       | Result | Evidence                                             |
| --------------------------------------------------------------- | ------ | ---------------------------------------------------- |
| No `red(` call remains; 0 expected failures                     | met    | grep count 0 at `13d4fc2`; 1410 passed               |
| Report contains the table of what marked does                   | met    | twenty rows; only a bullet list gains the line       |
| `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean | met    | `0 ERRORS 3 WARNINGS`; lines 98.76%; `✔ No issues`   |
| No existing assertion changed; in scope; nothing committed      | met    | two in-scope files; one removed test line (the flip) |

## Spirit

The plan asked for the simplest rule that is never wrong. The rule is loose on purpose (it does not compare markers) and only applies while the line is the last line of the stream. The executor verified its guards by disabling the rule (ten tests failed). Spirit met.

## Residual risk / follow-ups

- Failure counts of guard's independent corpora by snapshot: 27 of 120, 17 of 150, 22 of 220, 12 of 4226, 1 of 8426, 1 of 6200, 0 of 8000. A clean run is evidence, not proof: the contract is enforced by the committed fuzz suite, and a new divergence should be added there as a red test first.
- Stopping rule in force: this was the last fix plan of the batch.
