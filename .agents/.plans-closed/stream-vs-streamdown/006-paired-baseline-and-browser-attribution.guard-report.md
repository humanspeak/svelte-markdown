# Guard report — 006 paired-baseline-and-browser-attribution

**Recommendation: PASS** — paired protocol, semantic parity (0 mismatches on all ten scenarios in both suites), prefix-scaling and writeChunk scenarios, CDP attribution, and an archived baseline on a non-double-counting metric; every done criterion reproduced.
**Reviewed at** be3b3d7 · 2026-09-28 08:10 · **Plan planned at** 770f983 (amended 2026-09-28; original 7dea763)
**Integrated** — no PR: batch convention is one branch → one PR at batch close. Snapshots `e2f05da` (Steps 1–2), `770f983` (Steps 3–5), `be3b3d7` (Step 2b clamp + re-archive).

## Done criteria

| Criterion                                                                                                            | Result | Evidence                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runner supports paired mode and prints `paired delta`                                                                | met    | `scripts/stream-compare-bench.mjs:36` `MODE = … ?? 'paired'`; guard's own `citations` run printed `paired delta (theirs − ours …)`                                                    |
| Page reports `parityMismatches` (ours) and `domProjectionMatches` (cross-renderer)                                   | met    | `+page.svelte:142`; guard run → `parityMismatches: 0` of 31 checks; `dom projection: 1 difference(s)` (Streamdown renders no reference links)                                         |
| Scenarios `prefix-24kb/96kb/384kb`, `prose-mixed-writechunk`, `large-closed-block` exist and run                     | met    | present in `paired-run-1.json` results with 5 runs each, parity 0                                                                                                                     |
| `scripts/stream-compare-attribute.mjs` exists; attribution archived for 5 scenarios                                  | met    | file present, `trunk check` clean; `evidence/006/attribution/*.attribution.json` for prose-mixed, long-list, long-code-fence, citations, prefix-384kb                                 |
| `evidence/006/README.md` written with the CLAMPED metric; pre-clamp retained; batch README has the attribution table | met    | README sections Method/Environment/Correctness/Results/Step 2b check/Attribution/Top-15/Files; `evidence/006/pre-clamp/` holds the first capture; batch README updated in this commit |
| `pnpm check` 0 errors; `trunk check` clean; `pnpm test` green                                                        | met    | `0 ERRORS 3 WARNINGS`; `✔ No issues`; 160 files / 1176 tests, lines 98.5%                                                                                                             |
| No files under `src/lib/` modified                                                                                   | met    | `git log e2f05da..HEAD -- src/lib` lists only plans 008/013 commits (2fa41e4, 6e1abe7, 9ec976f, 6892589); none of 006's snapshots touch `src/lib`                                     |

## Spirit

The plan's purpose was a fair, repeatable, semantically verified measurement that later plans can trust. It now exists: paired alternating runs in one browser session; a parity detector that already caught two real library bugs (fixed in 008 and 013) and is clean everywhere; prefix-scaling scenarios that expose O(document) work directly (ours 6.0 → 12.2 → 61.6 ms/frame at 24/96/384 KB prefix, Streamdown 4.0 → 8.4 → 41.0); a CDP attribution that names the buckets and the hot functions. The executor also found and fixed a metric defect (double-counted overlapping windows) before it could contaminate the baseline, and demonstrated with a same-session control that the higher absolute totals of the re-capture are machine drift, not the clamp. Absolute numbers are comparable only within a capture; paired deltas and ratios are the currency. Spirit met.

## Scope & conduct

- In-scope only: yes (`+page.svelte`, `stream-compare-bench.mjs`, new `stream-compare-attribute.mjs`, `evidence/006/**`).
- STOP conditions respected: yes — the first pass stopped on the parity STOP; the resumed pass re-verified parity before proceeding; the comparator was never loosened.
- Plan amendment: 2026-09-28 Step 2b (clamp overlapping frame windows, re-run baseline); rationale in `006-…guard.md` checkpoint 2.

## Residual risk / follow-ups

- Streamdown renders 0 reference-style links on `citations` (ours 258): that scenario's cross-renderer comparison is not like-for-like and must be labeled as such in any docs claim.
- `long-code-fence` DOM projection differs only by Streamdown's per-line wrappers (documented).
- Raw traces/profiles live in `/tmp` only; the per-scenario summaries are archived. Re-run `scripts/stream-compare-attribute.mjs` to regenerate.
- Load during suites was 1.5–3.0 (1-min); the machine is shared — every later plan re-checks `uptime` before measured runs.
