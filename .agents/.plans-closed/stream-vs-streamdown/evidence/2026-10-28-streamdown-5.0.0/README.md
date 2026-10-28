# 2026-10-28 re-verification against svelte-streamdown 5.0.0

Purpose: check whether the Streaming Benchmarks numbers and the derived claims on the Svelte Streamdown comparison page still hold for svelte-streamdown 5.0.0 (released 2026-10-19). The published numbers come from svelte-streamdown 4.2.0 (captured 2026-09-28/29 on an Intel Core i7-6700K, Ubuntu 26.04), and were re-checked against 4.2.1 on 2026-10-16.

Machine: Intel Core i9-10910 @ 3.60GHz, macOS 26.7.1 (build 25G241), headless production Chromium via Playwright. Same harness and defaults as the published run (one warmup, five paired iterations per scenario). The machine was otherwise idle during each suite.

Runs:

- `control-streamdown-4.2.1.log`: one full suite against 4.2.1 on this machine, run before the version bump, to separate a version effect from a hardware effect.
- `suite1-streamdown-5.0.0.log` and `suite2-streamdown-5.0.0.log`: two full suites against 5.0.0, run back to back after the bump and a rebuild.

Correctness: Svelte Markdown reported zero parity mismatches in every scenario of all three runs. The `html-blocks` output-length warning is expected, because Streamdown shows raw HTML as text by default.

Result: Case C (stop). Every scenario keeps its winner, but the derived claim "About 30% of frames run long" on long lists and tables is not reproduced on this machine.

- Winners: the same winner as the published table holds in all 12 competitor scenarios, in the control and in both 5.0.0 suites.
- Version effect: Streamdown's work moved by more than 10% in several scenarios between the 4.2.1 control and the 5.0.0 suites. In prose-mixed-4x the control is 1,136.5 ms, and the 5.0.0 suites are 907.6 and 968.6 ms. This is not Case A.
- Derived claim "About 30% of frames run long" (long lists and tables): the Streamdown over-budget counts from the logs are below 30% in most runs.
    - Long list, Streamdown over budget (median of five runs, of 754 frames): control 186 (25%); 5.0.0 suite 1 143 (19%); 5.0.0 suite 2 201 (27%).
    - Long table, Streamdown over budget (median of five runs, of 314 frames): control 25 (8%); 5.0.0 suite 1 50 (16%); 5.0.0 suite 2 86 (27%).
    - Pooled over both 5.0.0 suites, the median is about 24% for lists and about 19% for tables.
    - The published table recorded 224–236 of 754 for lists and 81–95 of 314 for tables. This machine does not reproduce that level in either 5.0.0 suite.
- Derived claim "19% fewer elements" (page weight): element counts are not written to these logs, so this claim is not verified by this evidence.
- Derived claim "about twice the work when chunks arrive in bursts": the prose-mixed-4x ratio is 2.13–2.49 across the three runs, which still holds.
- Range claim "About 1.2–2.7x less work": on this machine the Streamdown ratio for long lists is about 3.0–3.3 in all three runs, and for loose lists 2.8–3.3, so the published upper bound is exceeded here. This matches the hardware shift in the control run (4.2.1 on this machine), not a version change.

Svelte Markdown reported zero parity mismatches in every scenario of all three runs. Median total work per scenario (ms), taken from the `median total work` line of each log. Ratio is Streamdown's total work divided by ours, so a value above 1 means Svelte Markdown did less work. A value below 1 means Streamdown did less work.

| Scenario                  | Ours, 4.2.1 control | Streamdown, 4.2.1 control | Ratio, control | Ours, 5.0.0 s1 | Streamdown, 5.0.0 s1 | Ratio, s1 | Ours, 5.0.0 s2 | Streamdown, 5.0.0 s2 | Ratio, s2 |
| ------------------------- | ------------------: | ------------------------: | -------------: | -------------: | -------------------: | --------: | -------------: | -------------------: | --------: |
| prose-mixed (1 per frame) |             1,148.1 |                   1,818.8 |           1.58 |        1,086.9 |              1,718.2 |      1.58 |        1,316.4 |              2,121.2 |      1.61 |
| prose-mixed-4x            |               456.5 |                   1,136.5 |           2.49 |          425.4 |                907.6 |      2.13 |          436.4 |                968.6 |      2.22 |
| long-list                 |             2,759.5 |                   8,642.8 |           3.13 |        2,668.3 |              8,137.7 |      3.05 |        2,931.4 |              9,013.2 |      3.07 |
| long-table                |             1,257.3 |                   2,875.7 |           2.29 |        1,422.3 |              3,091.7 |      2.17 |        1,554.9 |              3,709.4 |      2.39 |
| long-code-fence           |             1,081.4 |                     938.5 |           0.87 |        1,227.3 |                978.3 |      0.80 |        1,137.7 |                969.7 |      0.85 |
| citations                 |             1,062.2 |                     914.7 |           0.86 |        1,111.1 |                967.3 |      0.87 |        1,142.7 |              1,019.4 |      0.89 |
| loose-ordered-list        |             2,657.1 |                   8,770.7 |           3.30 |        3,488.7 |             10,959.6 |      3.14 |        3,671.0 |             10,181.1 |      2.77 |
| html-blocks               |             1,760.0 |                   1,282.5 |           0.73 |        2,087.6 |              1,434.8 |      0.69 |        2,143.8 |              1,654.5 |      0.77 |
| prefix-24kb               |               116.1 |                     164.6 |           1.42 |          121.8 |                183.5 |      1.51 |          147.7 |                214.1 |      1.45 |
| prefix-96kb               |               216.7 |                     437.9 |           2.02 |          273.0 |                510.9 |      1.87 |          322.5 |                695.0 |      2.16 |
| prefix-384kb              |               611.9 |                   2,026.2 |           3.31 |          903.2 |              2,336.0 |      2.59 |          862.6 |              2,134.9 |      2.47 |
| large-closed-block        |                92.7 |                     190.1 |           2.05 |          100.8 |                214.7 |      2.13 |          131.3 |                219.4 |      1.67 |

Ratios are computed from the logged medians. Each log's `median total work` line gives the per-suite median; the ratio is that Streamdown median divided by ours.

Decision: the docs page, the compare page, and `.competitive-intel/config.json` were not edited. The "About 30% of frames run long" claim, and the "About 1.2–2.7x" range that the lists exceed on this machine, need a human decision on wording. The `package.json` bump to 5.0.0 is in place so the suites could run, and can be reverted if the claims are not moved to 5.0.0.
