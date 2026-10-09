# Guard report — 007 raw-state-ab-for-stream-tokens

**Recommendation: PASS** — one-line change, kept on a decisive paired A/B: 18–56% less total work on every measured scenario in both repeats, parity 0 on both sides, all reset/replace suites green.
**Reviewed at** 840b204 · 2026-09-28 08:58 · **Plan planned at** 6318f73 (amended pre-flight 2026-09-28; original 7dea763)
**Integrated** — no PR: batch convention is one branch → one PR at batch close. Snapshot `840b204` on `perf/stream-bench-flush-timing`.

## Done criteria

| Criterion                                                                     | Result     | Evidence                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision recorded with paired deltas (kept or REJECTED)                       | met — KEPT | batch README row; deltas (A−B, median of 5, repeat 1 / 2): prose-mixed +594 / +515 ms (21% / 18%), long-list +6,769 / +7,728 (53% / 56%), citations +1,627 / +1,301 (38% / 30%), prefix-384kb +2,351 / +2,304 (51%); all 40 pairs positive (guard re-read every `ab-run-*.json`) |
| `grep "\$state.raw<Token\[\]>"` matches; `grep "\$state<Token\[\]>"` does not | met        | `SvelteMarkdown.svelte:140`; second grep 0 matches                                                                                                                                                                                                                               |
| `pnpm check` 0 errors; `pnpm test` exits 0                                    | met        | `0 ERRORS 3 WARNINGS`; 160 files / 1177 tests, lines 98.5%                                                                                                                                                                                                                       |
| `evidence/007/README.md` archived with parity = 0                             | met        | README + A/A controls + 8 A/B JSON/logs + attribution; guard counted 80 A/B runs, 0 with `parityMismatches ≠ 0`                                                                                                                                                                  |
| No files outside scope modified                                               | met        | snapshot touches `SvelteMarkdown.svelte` (+3/−1), `stream-compare-bench.mjs`, `SvelteMarkdown.issue-328.test.ts`, `evidence/007/**`                                                                                                                                              |

## Spirit

The plan asked for a single-variable test of the proxy hypothesis, not a leap of faith. The executor ran an A/A control first (+0.16–0.26%, noise), then two full paired repeats with identical builds apart from the one line, and confirmed the builds differ only in the library chunk. The attribution moved the way the hypothesis predicted: the deep-state proxy `get` trap, previously 8–12% of self time in every scenario, is gone from the top 15, and the library flush on `long-list` fell from ~4.0 s to ~1.6 s. `long-list` over-budget frames dropped from 367 to 3 in repeat 1. This is exactly the plan's intent, with the evidence the adversarial review demanded. `asyncTokens` was correctly left alone.

## Scope & conduct

- In-scope only: yes.
- STOP conditions: none fired; A/A control inside ±10%; no test failed after the change; parity 0 on B.
- Deviation: A served on 4174 instead of 4173 because a 19-hour-old stale preview held the port (guard has since killed it, PID 836853). Reported, harmless.
- Plan amendment: pre-flight only (A/B against the branch tip rather than `main`; baseline re-stamp).

## Residual risk / follow-ups

- Any future in-place mutation of `streamTokens` silently stops rendering; the invariant comment and the new DOM-identity guard are the tripwires. The executor did not verify the guard fails on a deliberate in-place mutation — a reviewer may want to try it once.
- `asyncTokens` remains deep `$state`; its own A/B if the async path is ever benchmarked.
- Remaining "JS outside flush" is now Parser render path + Svelte spread-props proxy (`long-list`) and forced layout + `isAppendOnlyUpdate` (`prose-mixed`) — inputs for Plans 010 and 011.
