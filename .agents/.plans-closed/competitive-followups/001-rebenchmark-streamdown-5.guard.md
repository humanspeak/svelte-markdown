# Guard log: 001 rebenchmark-streamdown-5

## Checkpoint 1 (2026-10-28 14:08), PLAN AMENDED

`82af5a1`. After the benchmark executor stopped at Step 4, Case C.

- The executor ran the 4.2.1 control and two 5.0.0 suites on an Intel Core i9-10910 with macOS 26.7.1, bumped `svelte-streamdown` to 5.0.0, wrote the evidence README, and correctly stopped without touching docs.
- Guard verified from the logs: all 12 scenarios keep their winner, and Svelte Markdown parity is 0 in every run. `domNodes` in the JSON are identical to the published page-weight table (1,381 vs 1,704 and so on). The executor had reported element counts as missing, but they are in the JSON section.
- The only claim that moved is "About 30% of frames run long". That figure depends on the machine (the 16.7 ms budget is absolute), and the 4.2.1 control on this i9 also shows only 24% on lists and 8% on tables. Streamdown 5.0.0 is not faster. It runs long on 19–27% of list frames, 16–27% of table frames and 37–42% of numbered-list frames. Ours is 0.
- Snapshot-committed the bump and evidence as `82af5a1`.
- Action: asked the operator. The operator chose "Replace with i9 numbers". Plan amended (Revision 3, `128d1d7`): Step 5B with exact figures. No suite re-run.

## Checkpoint 2 (2026-10-28 14:08), ON TRACK

`0973f2c`. After a haiku executor applied Step 5B, Step 6 and Step 7.

- I independently recomputed all 12 table rows from both suite logs with my own parser. Every cell matches the executor's table exactly: ms ranges, ratios and both over-budget columns.
- Parity safeguard edited from "210" to "130": verified 130 svelte-markdown runs with a parity field and 0 non-zero, so the edit is accepted. "16–42%" was verified (the upper bound is numbered lists, which are lists). Appending the machine sentence to the existing Smoothness note avoids a duplicate key, so it is accepted.
- Scope: 3 files (`config.json` `measured_against` only, the vs-svelte-streamdown entry only, the benchmarks svx). Page-weight table and "Where the time goes" untouched.
- Gates: `pnpm -C docs check` gives 0 errors. Pre-commit trunk and svelte-check passed. The Step 7 grep shows only historical 4.2.x mentions (control row, "Earlier captures"). No "30%" remains. `measured_against` is `5.0.0`. package.json pins `5.0.0`.
- The evidence README said "Case C, docs not edited", which was stale. Guard appended an "Outcome" section to keep the record accurate.
- Action: verdict PASS. Status row updated by guard.
