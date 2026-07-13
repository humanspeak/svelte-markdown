# Guard report — 001 redraw-regression-harness

**Recommendation: PASS** — all done criteria reproduced green by guard; the harness asserts exactly the bounds the plan specified, with no source files touched.
**Reviewed at** fd3f8a5 · 2026-07-13 14:59 · **Plan planned at** eed2e08
**Integrated** — PR <https://github.com/humanspeak/svelte-markdown/pull/365> opened via the `pr` skill for the reviewed snapshot commit

## Done criteria

| Criterion                                                        | Result | Evidence                                                                                                                                      |
| ---------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` exits 0                                             | met    | guard-run: `COMPLETED 1042 FILES 0 ERRORS 4 WARNINGS` (warnings pre-existing), exit 0                                                         |
| `pnpm test` exits 0 with thresholds; new test file exists+passes | met    | guard-run: exit 0, coverage 96.13% Stmts / 90.44% Branch / 96.29% Funcs / 97.69% Lines; targeted run of the new file: 5/5 passed              |
| Delta assertions exact/bounded as specified — not loosened       | met    | `redraw-regression.test.ts:88` `toBe(0)` for in-place growth; lines 110-111 and 164-165 `>=1 && <=3` for new blocks; observed `// current: 1` |
| `git status` shows no modified files outside the in-scope list   | met    | diff `0506f2d...fd3f8a5` touches only the new test file and the README status row; `Parser.svelte`/`SvelteMarkdown.svelte`/utils untouched    |
| README status row for 001 updated                                | met    | `.agents/.plans/redraw-hardening/README.md` row 001 → DONE                                                                                    |

## Spirit

The plan's purpose was to turn the dev-only `__svmParserCount` instrumentation into permanent CI tripwires so the library's entire anti-redraw stack — source-offset stable keys, streaming prefix reuse, inline fast paths — stops being unguarded, specifically as the safety net for plan 011's high-risk refactor. The delivered harness does exactly that: five tests covering counter liveness (calibration first, the plan's red-equivalent), zero-Parser in-place tail growth, O(1) new-block cost with the observed baseline documented in-line, and DOM node identity across both streaming flushes and non-streaming source replacement. Every assertion is a delta from a snapshot (correct for the cumulative counter) and every bound is the plan's own — a whole-document redraw regression would now fail this file loudly rather than hiding in noisy wall-clock timings. Intent fully delivered.

## Scope & conduct

- In-scope only? Yes — one new file `src/lib/SvelteMarkdown.redraw-regression.test.ts` plus the README status row. No source, bench-page, or Playwright changes.
- STOP conditions respected? Yes — none triggered: counter was live in Step 1, in-place delta was 0, identity assertions held, `writeChunk` existed. The executor also self-corrected a briefly-drafted `eslint-disable` comment (forbidden by CLAUDE.md) before finishing; the final file contains none.
- Plan amendments during execution: none.
- Accepted in-spirit deviations: Step 3 runs as a separate test with a fresh render rather than continuing Step 2's stream (equivalent tripwire; the plan's Test plan enumerates them as separate items); the unused `readParserByType` helper was dropped once the calibration log was removed.

## Residual risk / follow-ups

- The tree moved from `eed2e08` (planned-at) to `0506f2d` (v1.8.0) between planning and execution; the scoped drift check on the three watched files was empty, so the plan's counter semantics remained exact.
- These tests are the tripwire for plan 011: 011 must land with this file green and unmodified — enforce that in 011's review.
- The `[1, 3]` band and `// current: 1` baseline are deliberate; any future PR that changes these numbers must justify the new baseline in-line (plan's maintenance note).
- The counter is DEV-only; production builds compile it out, so this harness is unit-level only. An E2E variant was deliberately deferred by the plan.
