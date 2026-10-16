# 2026-10-16 re-verification against svelte-streamdown 4.2.1

Purpose: check whether the published Streaming Benchmarks numbers (svelte-streamdown 4.2.0, captured 2026-09-28/29 on an Intel Core i7-6700K, Ubuntu 26.04) still hold for svelte-streamdown 4.2.1.

Machine: Intel Core i9-10910, macOS 26.6.2, headless production Chromium via Playwright. Same harness and defaults as the published run (one warmup, five paired iterations).

Runs:

- `suite1-streamdown-4.2.1.log` and `suite2-streamdown-4.2.1.log`: two full suites against 4.2.1.
- `control-streamdown-4.2.0.log`: one full suite against 4.2.0 on the same machine, to separate a version effect from a hardware effect.

Result: Streamdown's total work per scenario under 4.2.0 falls inside the spread of the two 4.2.1 suites, or within run-to-run noise of it, in every scenario. The 4.2.0 to 4.2.1 change has no measurable performance effect. Ratios on this machine are mostly higher than the published ones (for example mixed prose 1.57–1.64 against 1.21–1.26), but the 4.2.0 control shows the same shift, so the cause is the hardware, not the version. Every scenario keeps the winner it has in the published table. Svelte Markdown reported zero parity mismatches in every run. The html-blocks output-length warning is expected, because Streamdown shows raw HTML as text by default.

Streamdown total work, median ms (4.2.1 suite 1 / suite 2 / 4.2.0 control):

| Scenario           | 4.2.1 s1 | 4.2.1 s2 |  4.2.0 |
| ------------------ | -------: | -------: | -----: |
| prose-mixed        |    2,006 |    2,209 |  2,145 |
| prose-mixed-4x     |    1,260 |    1,297 |  1,176 |
| long-list          |    9,920 |   10,227 |  9,903 |
| long-table         |    4,182 |    3,794 |  3,993 |
| long-code-fence    |    1,024 |    1,087 |  1,080 |
| citations          |    1,066 |    1,265 |  1,140 |
| loose-ordered-list |   13,481 |   12,469 | 12,256 |
| html-blocks        |    1,617 |    1,515 |  1,976 |
| prefix-24kb        |      229 |      211 |    247 |
| prefix-96kb        |      610 |      579 |    554 |
| prefix-384kb       |    2,827 |    2,293 |  2,315 |
| large-closed-block |      248 |      212 |    261 |

The published table was kept as-is because it comes from the original two-suite capture on one machine; the pages now note this re-verification.
