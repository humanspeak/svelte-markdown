# Guard report — 003 reference-scope-from-tokens

**Recommendation: PASS** — the plan's criteria are met: definitions are detected from marked's tokens, every bucket C test and the tricky-corpus fuzz pass as normal tests, and no `red(` call remained at the snapshot. An independent generative fuzz run by guard afterwards found three further boundary mechanisms that this plan did not target; they are carried into plan 005.
**Reviewed at** 0bfa7ab · 2026-09-29 04:12 · **Plan planned at** e0257d5
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                                       | Result | Evidence                                                                                                           |
| ------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| No `red(` call remains in the two parity files; 0 expected failures             | met    | `grep -c "red("` → 0 and 0; `pnpm test` 1293 passed, no "expected fail"                                            |
| `PARITY_STRICT=1` run is fully green                                            | met    | executor: 34/34; guard's `pnpm test` equivalent since nothing is marked red                                        |
| `appendTouchesReferenceDefinition` removed                                      | met    | `grep -c` → 0                                                                                                      |
| `pnpm check` 0 errors; `pnpm test` exits 0, coverage ≥ 90%; `trunk check` clean | met    | `0 ERRORS 3 WARNINGS`; lines 98.68%, branches 92.33%; `✔ No issues`                                                |
| Report lists every implementation-pinning test that changed                     | met    | nine tests, each with old and new assertion; every replacement lexes fewer characters; no output assertion changed |
| No files outside scope modified                                                 | met    | four in-scope files; `parse-and-cache.ts` untouched                                                                |

## Spirit

The decision moved from "guess from the appended text before lexing" to "read what marked produced after lexing the tail", which is the only way nested and multi-line definitions can ever be seen. As a side effect the old conservative fallback disappeared: a tail that cites a label defined earlier no longer forces a full re-lex, which the executor measured at 1,012 → 28 ms on a citations corpus with definitions first. Removing the 50% share cap was a reasoned deviation: once the tail is already lexed, re-lexing the citing roots can never cost more than lexing everything again. Spirit met for the plan's stated scope.

## Scope & conduct

- In-scope only: yes. STOP conditions: none fired. The `reuseMode` / `divergeAt` / `reusedPrefixCount` contract is unchanged.
- Deviations (judged sound): share cap removed; a citing root with its own nested definition is re-lexed as a fragment with its own labels left out of the seed map.

## Residual risk / follow-ups

- Guard's independent generative fuzz (random block combinations, 78,229 updates checked) found 27 of 120 documents still diverging at this snapshot: a definition frozen before its title line arrives (visible: stray paragraph, missing `title`), a block frozen while the last line is whitespace-only (raw split only), and a one-update blank-line split after a dropped duplicate definition (raw split only). None is a regression from this plan. Now a permanent test (`incremental-parser.fuzz.test.ts`) and the subject of plan 005.
- The cheap "is a reference used earlier" check is still a regex; it misses a use whose label spans a line break. Pre-existing; not in any corpus yet.
