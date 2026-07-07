# Guard report — 002 offset-mode-dos-guard

**Recommendation: PASS** — DoS hazard eliminated at two layers, all six done criteria reproduced green; the one anomalous test-suite flake is unreproducible and not attributable to this work.
**Reviewed at** `5f57063` · 2026-07-07 16:23 · **Plan planned at** `e057852` (amended; originally `939f154`)
**Integrated** — branch `advisor/002-offset-mode-dos-guard` @ `a2e0123` · PR <https://github.com/humanspeak/svelte-markdown/pull/343> · via the `commit` / `pr` skills. Merge remains the operator's.

## Done criteria

| Criterion                                               | Result | Evidence                                                                                                                                                                                          |
| ------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` exits 0                                    | met    | reproduced: `1007 FILES 0 ERRORS 4 WARNINGS` (4 warnings pre-existing, unrelated)                                                                                                                 |
| `pnpm test:only` exits 0; two new offset tests pass     | met    | reproduced 6/6 green in this gate (`930 passed (930)`); `SvelteMarkdown.test.ts:245` (excessive-gap drop) + `:259` (in-range) both pass. See residual risk re: one earlier non-reproducing flake. |
| `grep STREAM_MAX_OFFSET_GAP` shows constant + guard use | met    | `streaming-chunks.ts:6` (`= 1_000_000`), used at `:38` (guard) and `:112` (clamp); `SvelteMarkdown.svelte:325` (writeChunk), `:315` (apply)                                                       |
| far-beyond offset: no giant string, no throw            | met    | `getStreamingChunkInstruction` drops gap > 1M (`streaming-chunks.ts:79`, warn+return, no throw); asserted by `SvelteMarkdown.test.ts:245` (container text < 100 chars)                            |
| no files outside the (revised) in-scope list            | met    | `git diff ff081773...HEAD --stat`: 5 source files (all revised in-scope) + guard artifacts (plan/log/README) only                                                                                 |
| batch README row for 002 updated                        | met    | `README.md:26` → `DONE`                                                                                                                                                                           |

## Spirit

The plan's `Why this matters` was: a single offset chunk with a huge offset makes `' '.repeat(gap)` allocate hundreds of MB or throw an uncaught `RangeError`, crashing the streaming render. That hazard is genuinely gone — not papered over. The offending `' '.repeat` is now protected at both reachable entry points: `writeChunk` rejects any gap beyond `STREAM_MAX_OFFSET_GAP` (1,000,000) with a `warnStreaming` + early return and no throw (matching the sibling-validation convention the plan required), and the extracted, now-public `applyStreamingOffsetChunk` independently clamps its own padding so a direct caller can't bypass the guard. Normal offset streaming is untouched: for any gap ≤ cap the output is byte-identical to the original logic, proven by the in-range/overwrite/pad tests staying green. This delivers the intent exactly.

## Scope & conduct

- **In-scope only?** Yes, against the revised scope. Touched: `SvelteMarkdown.svelte`, `SvelteMarkdown.test.ts`, `streaming-chunks.ts` (new), `streaming-chunks.test.ts` (new), `streaming.ts` (re-export only) — all in the revised in-scope list — plus guard-owned artifacts (plan, guard log, README row).
- **STOP conditions respected?** The "excerpts no longer match / drift since 939f154" STOP was tripped — but by an **operator-directed** extraction of the streaming helpers, not a silent executor improvisation. It was surfaced at Checkpoint 1 and reconciled by amending the plan (Checkpoint 2), not skipped.
- **Plan amendments during execution:** one — 2026-07-07: in-scope list broadened to cover the extracted `streaming-chunks.ts`/tests + `streaming.ts` re-export; Done criterion 5 reworded; `Planned at` re-stamped `939f154` → `e057852`. Rationale: operator directed pulling functions out of the main component; the plan's original two-file scope predated that instruction (plan defect, not weak work — the guard's cap/message/no-throw behaviour and all criteria are unchanged and verified).

## Residual risk / follow-ups

- **Suite flake (pre-existing, non-blocking, NOT from this work).** One `pnpm test:only` run early in Checkpoint 3 reported `1 failed / 929 passed`; the failing test scrolled off before capture. It did **not** reproduce across **12** subsequent full runs (6 of them in this final gate). This work has no async/timing surface and every streaming test passed in all 13 runs, so the flake is not attributable to 002 — it reads as load-induced noise in the 145-file jsdom+timer suite. Recommend a separate follow-up: identify and quarantine the flaky test (capture a full log on a red run, or run serially with `--no-file-parallelism`). It is out of 002's scope and origin and should not gate this plan.
- **`applyStreamingOffsetChunk` is now a public export.** Intentional (extraction), and self-clamping, so the DoS surface is closed — but any future caller relies on the internal clamp rather than the `writeChunk` guard. The clamp + its unit test (`streaming-chunks.test.ts:152`) are the durable protection; keep them if the function is refactored.
