# Guard report — 002 stream-reset-array-replacement

**Recommendation: PASS** — all six done criteria reproduced green by guard; the diff is exactly the three-site swap plus characterization tests, nothing else.
**Reviewed at** 045232b · 2026-07-13 14:53 · **Plan planned at** eed2e08
**Integrated** — PR <https://github.com/humanspeak/svelte-markdown/pull/364> opened via the `pr` skill for the reviewed snapshot commit

## Done criteria

| Criterion                                                     | Result | Evidence                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `grep -rn "streamTokens.length" src/lib/` returns no matches  | met    | guard-run grep exited 1 (no matches)                                                                                                                                                                                                                                  |
| `pnpm check` exits 0                                          | met    | guard-run: `COMPLETED 1042 FILES 0 ERRORS 4 WARNINGS` (warnings pre-existing), exit 0                                                                                                                                                                                 |
| `pnpm test` exits 0 with coverage thresholds met              | met    | guard-run: 145 files / 960 tests passed; Statements 96.13%, Branches 90.44%, Functions 96.29%, Lines 97.69%; exit 0                                                                                                                                                   |
| Reset-to-empty covered by a named unit test that passes       | met    | `src/lib/SvelteMarkdown.stream-reset.test.ts` — "imperative resetStream(\"\") empties the DOM" and "prop-driven source: \"\" while streaming empties the DOM", 2/2 passed in guard's run; imperative path also pre-covered by `SvelteMarkdown.streaming-html.test.ts` |
| `git status` shows no files changed outside the in-scope list | met    | diff `0506f2d...045232b` touches only `SvelteMarkdown.svelte` (3 sites + 1 comment line), the new test file, and the README row                                                                                                                                       |
| README status row for 002 updated                             | met    | `.agents/.plans/redraw-hardening/README.md` row 002 → DONE                                                                                                                                                                                                            |

## Spirit

The plan's intent was to eliminate the last three writes that shrink the reactive `streamTokens` array in place — the exact operation class issue #291 deprecated — so the invariant "streamTokens is only ever assigned, never structurally mutated" becomes greppable and true. The diff delivers precisely that: all three reset sites now assign `[]`, the #291 rationale comment gains the one-line rule extension the plan suggested, and the previously-uncovered prop-driven `source: ''` reset path is pinned by a characterization test that was proven green against unchanged source before the swap (so the refactor is demonstrably behavior-preserving, not silently fixing or breaking anything). No gap between letter and intent.

## Scope & conduct

- In-scope only? Yes — `src/lib/SvelteMarkdown.svelte` (three sites + optional comment), new `src/lib/SvelteMarkdown.stream-reset.test.ts`, README status row. Out-of-scope regions (`applyStreamingSource` assignment, buffers, `src/lib/utils/**`) untouched.
- STOP conditions respected? Yes — none triggered: drift check clean, characterization tests green pre-change, all existing streaming tests green post-change.
- Plan amendments during execution: none.
- Noted deviation (accepted): the new test's docstring was worded to avoid the literal `streamTokens.length` string so the done-criterion grep stays clean. The grep targets source mutation writes; the docstring is still accurate, so this is compliance with the criterion's spirit, not gaming.

## Residual risk / follow-ups

- The tree moved from `eed2e08` (planned-at) to `0506f2d` (v1.8.0 + shiki #361 + plans batch #363) between planning and execution; the scoped drift check on `SvelteMarkdown.svelte` was empty, so plan excerpts remained exact.
- Plan 011 (token-reuse identity refactor) touches the same assignment region; per the batch README, this plan intentionally lands first to avoid merge churn — merge this before dispatching 011.
- Future reviews: any `streamTokens.push/splice/length` write is now a rejectable pattern — point offenders at the #291 comment block (`SvelteMarkdown.svelte:174-184`).
